import { deserialize, serialize } from "node:v8";

import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = <T>(value: T): T => deserialize(serialize(value));
}

type FeedCache = typeof import("@/lib/feedCache");
let cache: FeedCache;

const page = { skip: 0, limit: 20, hasMore: true };

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  jest.resetModules();
  cache = await import("@/lib/feedCache");
});

describe("feedCache", () => {
  it("round-trips a feed for the same user", async () => {
    expect(await cache.saveFeed("forYou", "u1", [{ PostID: "a" }, { PostID: "b" }], page)).toBe(true);

    const loaded = await cache.loadFeed<{ PostID: string }>("forYou", "u1");

    expect(loaded?.data.map((p) => p.PostID)).toEqual(["a", "b"]);
    expect(loaded?.pagination).toEqual(page);
    expect(typeof loaded?.savedAt).toBe("number");
  });

  it("keeps each feed separately", async () => {
    await cache.saveFeed("forYou", "u1", [{ PostID: "fy" }], page);
    await cache.saveFeed("following", "u1", [{ PostID: "fo" }], page);
    await cache.saveFeed("status", "u1", ["avatar.png"], page);

    expect((await cache.loadFeed<{ PostID: string }>("forYou", "u1"))?.data[0].PostID).toBe("fy");
    expect((await cache.loadFeed<{ PostID: string }>("following", "u1"))?.data[0].PostID).toBe("fo");
    expect((await cache.loadFeed<string>("status", "u1"))?.data).toEqual(["avatar.png"]);
  });

  it("replaces an older copy of the same feed", async () => {
    await cache.saveFeed("forYou", "u1", [{ PostID: "old" }], page);
    await cache.saveFeed("forYou", "u1", [{ PostID: "new" }], page);
    expect((await cache.loadFeed<{ PostID: string }>("forYou", "u1"))?.data).toEqual([{ PostID: "new" }]);
  });

  it("never returns another user's feed", async () => {
    await cache.saveFeed("forYou", "u1", [{ PostID: "a" }], page);
    expect(await cache.loadFeed("forYou", "u2")).toBeNull();
    expect(await cache.loadFeed("forYou", "")).toBeNull();
  });

  it("returns null for a feed that was never saved, and refuses to save without a user", async () => {
    expect(await cache.loadFeed("forYou", "u1")).toBeNull();
    expect(await cache.saveFeed("forYou", "", [{ PostID: "a" }], page)).toBe(false);
  });

  it("clearFeedCache removes everything", async () => {
    await cache.saveFeed("forYou", "u1", [{ PostID: "a" }], page);
    await cache.saveFeed("status", "u1", ["x"], page);
    await cache.clearFeedCache();
    expect(await cache.loadFeed("forYou", "u1")).toBeNull();
    expect(await cache.loadFeed("status", "u1")).toBeNull();
  });
});

describe("feedCache without a usable IndexedDB", () => {
  const original = globalThis.indexedDB;
  afterEach(() => {
    globalThis.indexedDB = original;
  });

  it("is a harmless no-op", async () => {
    // @ts-expect-error simulate a browser without IndexedDB
    globalThis.indexedDB = undefined;
    jest.resetModules();
    const missing = await import("@/lib/feedCache");

    expect(await missing.saveFeed("forYou", "u1", [{ PostID: "a" }], page)).toBe(false);
    expect(await missing.loadFeed("forYou", "u1")).toBeNull();
    await expect(missing.clearFeedCache()).resolves.toBeUndefined();
  });
});
