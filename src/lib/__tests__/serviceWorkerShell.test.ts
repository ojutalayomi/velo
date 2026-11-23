/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

/* Runs the real serviceworker/index.js in a sandbox with a fake `caches`, `fetch` and events. */

type Listener = (event: unknown) => void;
const keyOf = (k: unknown) => (typeof k === "string" ? k : (k as { url: string }).url);

function makeCaches(fetchMock: jest.Mock) {
  const stores = new Map<string, Map<string, Response>>();
  const open = async (name: string) => {
    const entries = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, entries);
    return {
      match: async (k: unknown) => entries.get(keyOf(k))?.clone(),
      put: async (k: unknown, r: Response) => {
        if (r.status === 206) throw new TypeError("partial");
        entries.set(keyOf(k), r);
      },
      delete: async (k: unknown) => entries.delete(keyOf(k)),
      keys: async () => [...entries.keys()].map((url) => ({ url })),
      add: async (url: string) => entries.set(url, await fetchMock(url)),
    };
  };
  return {
    stores,
    api: {
      open,
      keys: async () => [...stores.keys()],
      delete: async (name: string) => stores.delete(name),
    },
    names: (name: string) => [...(stores.get(name)?.keys() ?? [])],
  };
}

function loadWorker(href = "https://app.test/sw.js?shell=1") {
  const listeners: Record<string, Listener[]> = {};
  const fetchMock = jest.fn();
  const store = makeCaches(fetchMock);
  const self = {
    location: new URL(href),
    addEventListener: (type: string, fn: Listener) => (listeners[type] ??= []).push(fn),
    skipWaiting: jest.fn(async () => {}),
    clients: { claim: jest.fn(async () => {}), matchAll: jest.fn(async () => []) },
    registration: { showNotification: jest.fn(), getNotifications: jest.fn(async () => []) },
  };
  const context = vm.createContext({
    self,
    caches: store.api,
    fetch: fetchMock,
    Response,
    Request,
    Headers,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    console,
    TextEncoder,
  });
  vm.runInContext(readFileSync(join(process.cwd(), "serviceworker/index.js"), "utf8"), context);
  return { listeners, fetchMock, store, self };
}
type Worker = ReturnType<typeof loadWorker>;

type FakeRequest = {
  url: string;
  method: string;
  mode: string;
  destination: string;
  headers: Headers;
};
const req = (
  path: string,
  init: Omit<Partial<FakeRequest>, "headers"> & { headers?: Record<string, string> } = {}
): FakeRequest => ({
  url: path.startsWith("http") ? path : `https://app.test${path}`,
  method: "GET",
  mode: "cors",
  destination: "",
  ...init,
  headers: new Headers(init.headers),
});
const navigate = (path: string) => req(path, { mode: "navigate", destination: "document" });

async function dispatchFetch(worker: Worker, request: FakeRequest) {
  let responded: Promise<Response> | undefined;
  const waits: Promise<unknown>[] = [];
  const event = {
    request,
    respondWith: (p: Promise<Response>) => (responded = Promise.resolve(p)),
    waitUntil: (p: Promise<unknown>) => waits.push(Promise.resolve(p)),
  };
  (worker.listeners.fetch ?? []).forEach((l) => l(event));
  return {
    handled: !!responded,
    response: responded ? await responded : undefined,
    settle: () => Promise.all(waits),
  };
}

async function dispatchLifecycle(worker: Worker, type: "install" | "activate") {
  const waits: Promise<unknown>[] = [];
  (worker.listeners[type] ?? []).forEach((l) => l({ waitUntil: (p: Promise<unknown>) => waits.push(Promise.resolve(p)) }));
  await Promise.all(waits);
}

const html = (body = "<html>page</html>", init: ResponseInit = {}) =>
  new Response(body, { status: 200, headers: { "content-type": "text/html; charset=utf-8" }, ...init });
const image = () => new Response("png", { status: 200, headers: { "content-type": "image/png" } });
const withFlag = (response: Response, flags: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(flags)) Object.defineProperty(response, key, { value });
  return response;
};

afterEach(() => {
  jest.useRealTimers();
});

describe("worker basics", () => {
  it("keeps the push handlers", () => {
    const { listeners } = loadWorker();
    expect(Object.keys(listeners)).toEqual(
      expect.arrayContaining(["push", "notificationclick", "pushsubscriptionchange", "install", "activate", "fetch"])
    );
  });

  it("does nothing on fetch without the ?shell=1 flag (e.g. next dev)", async () => {
    const worker = loadWorker("https://app.test/sw.js");
    for (const r of [navigate("/chats"), req("/_next/static/a.js"), req("/a.png", { destination: "image" })]) {
      expect((await dispatchFetch(worker, r)).handled).toBe(false);
    }
  });

  it("does not precache the offline page without the flag", async () => {
    const worker = loadWorker("https://app.test/sw.js");
    await dispatchLifecycle(worker, "install");
    expect(worker.fetchMock).not.toHaveBeenCalled();
  });
});

describe("requests it must leave alone", () => {
  it.each([
    ["a POST", req("/chats", { method: "POST", mode: "navigate" })],
    ["another origin", req("https://files-for-chat.s3.amazonaws.com/a.png", { destination: "image" })],
    ["an API call", req("/api/chats")],
    ["a Range request", req("/_next/static/a.js", { headers: { range: "bytes=0-10" } })],
    ["an RSC fetch (query)", req("/chats?_rsc=abc")],
    ["an RSC fetch (header)", req("/chats", { headers: { RSC: "1" } })],
    ["the worker script", req("/sw.js")],
  ])("passes through %s", async (_label, request) => {
    const worker = loadWorker();
    expect((await dispatchFetch(worker, request)).handled).toBe(false);
  });

  it.each(["/accounts/login", "/accounts/logout", "/auth/error", "/admin/users", "/api/chats"])(
    "never takes over a navigation to %s",
    async (path) => {
      const worker = loadWorker();
      expect((await dispatchFetch(worker, navigate(path))).handled).toBe(false);
    }
  );
});

describe("page navigations", () => {
  it("shows the live page and keeps a copy", async () => {
    const worker = loadWorker();
    worker.fetchMock.mockResolvedValue(html("<html>live</html>"));

    const result = await dispatchFetch(worker, navigate("/chats"));
    await result.settle();

    expect(await result.response!.text()).toBe("<html>live</html>");
    expect(worker.store.names("velo-pages-v1")).toEqual(["https://app.test/chats"]);
  });

  it("falls back to the saved copy when the network is down", async () => {
    const worker = loadWorker();
    worker.fetchMock.mockResolvedValueOnce(html("<html>saved</html>"));
    await (await dispatchFetch(worker, navigate("/chats"))).settle();

    worker.fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const offline = await dispatchFetch(worker, navigate("/chats"));

    expect(await offline.response!.text()).toBe("<html>saved</html>");
  });

  it("shows the offline page for a page that was never saved", async () => {
    const worker = loadWorker();
    worker.fetchMock.mockResolvedValueOnce(html("<html>OFFLINE PAGE</html>"));
    await dispatchLifecycle(worker, "install");
    expect(worker.fetchMock).toHaveBeenCalledWith("/offline", { cache: "reload" });

    worker.fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await dispatchFetch(worker, navigate("/chats/never-visited"));

    expect(await result.response!.text()).toBe("<html>OFFLINE PAGE</html>");
  });

  it("still answers (503) if even the offline page was never saved", async () => {
    const worker = loadWorker();
    worker.fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await dispatchFetch(worker, navigate("/chats"));

    expect(result.response!.status).toBe(503);
  });

  it.each([
    ["a redirect to login", () => withFlag(html("", { status: 200 }), { redirected: true })],
    ["an opaque redirect", () => withFlag(html("", { status: 200 }), { type: "opaqueredirect" })],
    ["a 404", () => html("nope", { status: 404 })],
    ["a 500", () => html("boom", { status: 500 })],
    ["non-HTML", () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } })],
  ])("does not save %s, and still shows it", async (_label, make) => {
    const worker = loadWorker();
    const response = make();
    worker.fetchMock.mockResolvedValue(response);

    const result = await dispatchFetch(worker, navigate("/chats"));
    await result.settle();

    expect(result.response).toBe(response);
    expect(worker.store.names("velo-pages-v1")).toEqual([]);
  });

  it("serves the saved page when the network is slower than the timeout", async () => {
    jest.useFakeTimers();
    const worker = loadWorker();
    worker.fetchMock.mockResolvedValueOnce(html("<html>saved</html>"));
    await (await dispatchFetch(worker, navigate("/chats"))).settle();

    let finish!: (r: Response) => void;
    worker.fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    const pending = dispatchFetch(worker, navigate("/chats"));
    await jest.advanceTimersByTimeAsync(4000);
    const result = await pending;

    expect(await result.response!.text()).toBe("<html>saved</html>");

    // The slow request keeps going and refreshes the copy for next time.
    finish(html("<html>fresh</html>"));
    await result.settle();
    worker.fetchMock.mockRejectedValue(new TypeError("offline"));
    const later = await dispatchFetch(worker, navigate("/chats"));
    expect(await later.response!.text()).toBe("<html>fresh</html>");
  });

  it("keeps waiting for a slow network when nothing is saved", async () => {
    jest.useFakeTimers();
    const worker = loadWorker();
    let finish!: (r: Response) => void;
    worker.fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));

    const pending = dispatchFetch(worker, navigate("/chats"));
    await jest.advanceTimersByTimeAsync(4000);
    finish(html("<html>slow but live</html>"));
    const result = await pending;

    expect(await result.response!.text()).toBe("<html>slow but live</html>");
  });

  it("saves each URL separately, query string included", async () => {
    const worker = loadWorker();
    worker.fetchMock.mockImplementation(async () => html());

    await (await dispatchFetch(worker, navigate("/chats/a"))).settle();
    await (await dispatchFetch(worker, navigate("/chats/b?x=1"))).settle();

    expect(worker.store.names("velo-pages-v1")).toEqual([
      "https://app.test/chats/a",
      "https://app.test/chats/b?x=1",
    ]);
  });

  it("keeps only the 60 most recent pages", async () => {
    const worker = loadWorker();
    worker.fetchMock.mockImplementation(async () => html());

    for (let i = 0; i < 65; i += 1) await (await dispatchFetch(worker, navigate(`/chats/${i}`))).settle();

    const kept = worker.store.names("velo-pages-v1");
    expect(kept).toHaveLength(60);
    expect(kept).not.toContain("https://app.test/chats/0");
    expect(kept).toContain("https://app.test/chats/64");
  });

  it("is not broken by a cache write failing", async () => {
    const worker = loadWorker();
    const cache = await worker.store.api.open("velo-pages-v1");
    worker.store.api.open = async () => ({ ...cache, put: async () => { throw new Error("quota"); } });
    worker.fetchMock.mockResolvedValue(html("<html>live</html>"));

    const result = await dispatchFetch(worker, navigate("/chats"));

    expect(await result.response!.text()).toBe("<html>live</html>");
  });
});

describe("build assets", () => {
  it("serves /_next/static files from the saved copy after the first fetch", async () => {
    const worker = loadWorker();
    worker.fetchMock.mockResolvedValue(new Response("code", { status: 200 }));

    await dispatchFetch(worker, req("/_next/static/chunks/a.js"));
    worker.fetchMock.mockClear();
    const again = await dispatchFetch(worker, req("/_next/static/chunks/a.js"));

    expect(await again.response!.text()).toBe("code");
    expect(worker.fetchMock).not.toHaveBeenCalled();
  });

  it("does not save a failed asset request", async () => {
    const worker = loadWorker();
    worker.fetchMock.mockResolvedValue(new Response("nope", { status: 404 }));

    await dispatchFetch(worker, req("/_next/static/chunks/missing.js"));

    expect(worker.store.names("velo-static-v1")).toEqual([]);
  });
});

describe("images", () => {
  it("fetches an image the first time and saves it", async () => {
    const worker = loadWorker();
    worker.fetchMock.mockResolvedValue(image());

    const result = await dispatchFetch(worker, req("/avatar.png", { destination: "image" }));
    await result.settle();

    expect(result.response!.status).toBe(200);
    expect(worker.store.names("velo-assets-v1")).toEqual(["https://app.test/avatar.png"]);
  });

  it("shows the saved image immediately and refreshes it in the background", async () => {
    const worker = loadWorker();
    worker.fetchMock.mockResolvedValueOnce(new Response("old", { status: 200 }));
    await (await dispatchFetch(worker, req("/avatar.png", { destination: "image" }))).settle();

    worker.fetchMock.mockResolvedValueOnce(new Response("new", { status: 200 }));
    const result = await dispatchFetch(worker, req("/avatar.png", { destination: "image" }));
    expect(await result.response!.text()).toBe("old");
    await result.settle();

    worker.fetchMock.mockRejectedValue(new TypeError("offline"));
    const offline = await dispatchFetch(worker, req("/avatar.png", { destination: "image" }));
    expect(await offline.response!.text()).toBe("new");
  });

  it("shows a network error for an unsaved image when offline", async () => {
    const worker = loadWorker();
    worker.fetchMock.mockRejectedValue(new TypeError("offline"));

    const result = await dispatchFetch(worker, req("/avatar.png", { destination: "image" }));

    expect(result.response!.type).toBe("error");
  });

  it("does not cache scripts or other requests", async () => {
    const worker = loadWorker();
    expect((await dispatchFetch(worker, req("/data.json", { destination: "empty" }))).handled).toBe(false);
  });
});

describe("activate", () => {
  it("removes old shell caches but leaves every other cache alone", async () => {
    const worker = loadWorker();
    for (const name of ["velo-static-v0", "velo-pages-v0", "velo-assets-v0", "velo-static-v1", "velo-chat-media-v1", "other-app"]) {
      await worker.store.api.open(name);
    }

    await dispatchLifecycle(worker, "activate");

    expect([...worker.store.stores.keys()].sort()).toEqual([
      "other-app",
      "velo-chat-media-v1",
      "velo-static-v1",
    ]);
  });
});
