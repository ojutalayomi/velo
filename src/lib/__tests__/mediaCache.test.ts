/**
 * @jest-environment node
 */
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

type Mod = typeof import("@/lib/mediaCache");
let mod: Mod;

/** Just enough CacheStorage for the module: open/match/put/delete, and the real 206 refusal. */
function installCaches() {
  const stores = new Map<string, Map<string, Response>>();
  const storage = {
    open: async (name: string) => {
      const entries = stores.get(name) ?? new Map<string, Response>();
      stores.set(name, entries);
      return {
        match: async (url: string) => entries.get(url)?.clone(),
        put: async (url: string, response: Response) => {
          if (response.status === 206) throw new TypeError("Partial response (status code 206) is unsupported");
          entries.set(url, response);
        },
        delete: async (url: string) => entries.delete(url),
      };
    },
    delete: async (name: string) => stores.delete(name),
  };
  (globalThis as unknown as { caches: unknown }).caches = storage;
  return { stores, entries: () => stores.get("velo-chat-media-v1") ?? new Map<string, Response>() };
}

const reply = (bytes: number, init: ResponseInit = {}, type = "audio/webm") =>
  new Response(new Blob([new Uint8Array(bytes)], { type }), { status: 200, ...init });

let fakeCaches: ReturnType<typeof installCaches>;
let fetchMock: jest.Mock;

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  fakeCaches = installCaches();
  fetchMock = jest.fn(async () => reply(10));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  Object.defineProperty(globalThis, "navigator", {
    value: { storage: { persist: jest.fn(async () => true) } },
    configurable: true,
  });
  jest.resetModules();
  mod = await import("@/lib/mediaCache");
});

describe("cacheMedia", () => {
  it("saves a file and returns a blob URL for the copy", async () => {
    const blobUrl = await mod.cacheMedia("https://s3/x.webm", "audio");

    expect(blobUrl).toMatch(/^blob:/);
    expect(fakeCaches.entries().has("https://s3/x.webm")).toBe(true);
  });

  it("fetches with CORS and without credentials (never an opaque response)", async () => {
    await mod.cacheMedia("https://s3/x.webm", "audio");

    expect(fetchMock).toHaveBeenCalledWith("https://s3/x.webm", { mode: "cors", credentials: "omit" });
  });

  it("serves the saved copy without touching the network", async () => {
    await mod.cacheMedia("https://s3/x.webm", "audio");
    fetchMock.mockClear();

    const blobUrl = await mod.getCachedMediaUrl("https://s3/x.webm");

    expect(blobUrl).toMatch(/^blob:/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null for a file that was never saved", async () => {
    expect(await mod.getCachedMediaUrl("https://s3/never.webm")).toBeNull();
  });

  it.each([
    ["partial (206)", { status: 206 }],
    ["not found (404)", { status: 404 }],
    ["server error (500)", { status: 500 }],
  ])("does not save a %s response", async (_label, init) => {
    fetchMock.mockResolvedValue(reply(10, init));

    expect(await mod.cacheMedia("https://s3/x.webm", "audio")).toBeNull();
    expect(fakeCaches.entries().size).toBe(0);
  });

  it("returns null and saves nothing when the request fails (offline, CORS)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    expect(await mod.cacheMedia("https://s3/x.webm", "audio")).toBeNull();
    expect(fakeCaches.entries().size).toBe(0);
  });

  it("skips files over the cap, whether or not the server declares a length", async () => {
    mod.MEDIA_LIMITS.perFile.audio = 100;

    fetchMock.mockResolvedValueOnce(reply(500, { headers: { "content-length": "500" } }));
    expect(await mod.cacheMedia("https://s3/declared.webm", "audio")).toBeNull();

    fetchMock.mockResolvedValueOnce(reply(500)); // no content-length
    expect(await mod.cacheMedia("https://s3/undeclared.webm", "audio")).toBeNull();

    expect(fakeCaches.entries().size).toBe(0);
  });

  it("allows videos a larger cap than audio", async () => {
    mod.MEDIA_LIMITS.perFile.audio = 100;
    mod.MEDIA_LIMITS.perFile.video = 1000;
    fetchMock.mockImplementation(async () => reply(500, {}, "video/mp4"));

    expect(await mod.cacheMedia("https://s3/a.webm", "audio")).toBeNull();
    expect(await mod.cacheMedia("https://s3/v.mp4", "video")).toMatch(/^blob:/);
  });

  it.each(["blob:http://localhost/abc", "data:audio/webm;base64,AAAA", ""])(
    "never saves a local or empty URL (%p)",
    async (url) => {
      expect(await mod.cacheMedia(url, "audio")).toBeNull();
      expect(await mod.getCachedMediaUrl(url)).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it("shares one download between concurrent calls for the same file", async () => {
    const [a, b] = await Promise.all([
      mod.cacheMedia("https://s3/x.webm", "audio"),
      mod.cacheMedia("https://s3/x.webm", "audio"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("asks the browser for persistent storage, once", async () => {
    await mod.cacheMedia("https://s3/a.webm", "audio");
    await mod.cacheMedia("https://s3/b.webm", "audio");

    expect(navigator.storage.persist).toHaveBeenCalledTimes(1);
  });
});

describe("eviction", () => {
  it("removes the least recently used files first when over the total budget", async () => {
    mod.MEDIA_LIMITS.total = 250;
    const now = jest.spyOn(Date, "now");
    fetchMock.mockImplementation(async () => reply(100));

    now.mockReturnValue(1_000);
    await mod.cacheMedia("https://s3/a.webm", "audio");
    now.mockReturnValue(2_000);
    await mod.cacheMedia("https://s3/b.webm", "audio");
    // a is opened again, so b is now the oldest.
    now.mockReturnValue(3_000);
    await mod.getCachedMediaUrl("https://s3/a.webm");
    now.mockReturnValue(4_000);
    await mod.cacheMedia("https://s3/c.webm", "audio"); // 300 > 250: something must go

    const kept = [...fakeCaches.entries().keys()].sort();
    expect(kept).toEqual(["https://s3/a.webm", "https://s3/c.webm"]);
    now.mockRestore();
  });

  it("keeps everything while under budget", async () => {
    mod.MEDIA_LIMITS.total = 1000;
    fetchMock.mockImplementation(async () => reply(100));

    await mod.cacheMedia("https://s3/a.webm", "audio");
    await mod.cacheMedia("https://s3/b.webm", "audio");

    expect(fakeCaches.entries().size).toBe(2);
  });
});

describe("clearMediaCache", () => {
  it("deletes every saved file and forgets the index", async () => {
    await mod.cacheMedia("https://s3/a.webm", "audio");
    await mod.clearMediaCache();

    expect(await mod.getCachedMediaUrl("https://s3/a.webm")).toBeNull();
    expect(fakeCaches.entries().size).toBe(0);
  });
});

describe("without the Cache API", () => {
  beforeEach(() => {
    delete (globalThis as { caches?: unknown }).caches;
  });

  it("is a harmless no-op", async () => {
    expect(mod.isMediaCacheSupported()).toBe(false);
    expect(await mod.cacheMedia("https://s3/a.webm", "audio")).toBeNull();
    expect(await mod.getCachedMediaUrl("https://s3/a.webm")).toBeNull();
    await expect(mod.clearMediaCache()).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
