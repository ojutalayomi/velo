import { deserialize, serialize } from "node:v8";

import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

import type { AllChats, MessageAttributes } from "@/lib/types/type";

// jest-environment-jsdom has no structuredClone, which fake-indexeddb uses to copy stored values.
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = <T>(value: T): T => deserialize(serialize(value));
}

type CacheModule = typeof import("@/lib/chatCache");

const msg = (id: string, chatId = "c1", extra: Partial<MessageAttributes> = {}) =>
  ({ _id: id, chatId, content: `m${id}`, timestamp: "2026-01-01T00:00:00.000Z", ...extra }) as
    unknown as MessageAttributes;

const snapshot = (userId: string, messages: MessageAttributes[]): AllChats =>
  ({
    chats: [{ _id: "c1" }],
    chatSettings: {},
    messages,
    requestId: userId,
    pagination: { messages: { skip: 0, limit: 500, hasMore: false } },
  }) as unknown as AllChats;

let cache: CacheModule;

beforeEach(async () => {
  // A fresh database and a fresh module (it memoises the open connection) for every test.
  globalThis.indexedDB = new IDBFactory();
  jest.resetModules();
  cache = await import("@/lib/chatCache");
});

describe("chatCache", () => {
  it("round-trips a snapshot for the same user", async () => {
    await cache.saveChatSnapshot(snapshot("u1", [msg("1"), msg("2")]));
    const loaded = await cache.loadChatSnapshot("u1");

    expect(loaded?.requestId).toBe("u1");
    expect(loaded?.messages?.map((m) => m._id).sort()).toEqual(["1", "2"]);
    expect(loaded?.chats).toEqual([{ _id: "c1" }]);
    expect(loaded?.pagination?.messages.hasMore).toBe(false);
    expect(loaded).not.toHaveProperty("savedAt");
  });

  it("never returns another user's snapshot", async () => {
    await cache.saveChatSnapshot(snapshot("u1", [msg("1")]));
    expect(await cache.loadChatSnapshot("u2")).toBeNull();
    expect(await cache.loadChatSnapshot("")).toBeNull();
  });

  it("returns null when nothing has been saved", async () => {
    expect(await cache.loadChatSnapshot("u1")).toBeNull();
  });

  it("replaces the previous snapshot so server-side deletions don't linger", async () => {
    await cache.saveChatSnapshot(snapshot("u1", [msg("1"), msg("2")]));
    await cache.saveChatSnapshot(snapshot("u1", [msg("2"), msg("3")]));
    const loaded = await cache.loadChatSnapshot("u1");

    expect(loaded?.messages?.map((m) => m._id).sort()).toEqual(["2", "3"]);
  });

  it("ignores snapshots without a requestId and messages without an _id", async () => {
    await cache.saveChatSnapshot(snapshot("", [msg("1")]));
    expect(await cache.loadChatSnapshot("")).toBeNull();

    await cache.saveChatSnapshot(snapshot("u1", [msg("1"), { content: "no id" } as never]));
    expect((await cache.loadChatSnapshot("u1"))?.messages).toHaveLength(1);
  });

  it("clearChatCache removes everything", async () => {
    await cache.saveChatSnapshot(snapshot("u1", [msg("1")]));
    await cache.clearChatCache();
    expect(await cache.loadChatSnapshot("u1")).toBeNull();
  });
});

describe("chatCache without a usable IndexedDB", () => {
  const original = globalThis.indexedDB;
  afterEach(() => {
    globalThis.indexedDB = original;
  });

  it("is a harmless no-op when IndexedDB is missing", async () => {
    // @ts-expect-error simulate a browser without IndexedDB
    globalThis.indexedDB = undefined;
    jest.resetModules();
    const missing = await import("@/lib/chatCache");

    expect(missing.isChatCacheSupported()).toBe(false);
    await expect(missing.saveChatSnapshot(snapshot("u1", [msg("1")]))).resolves.toBeUndefined();
    await expect(missing.loadChatSnapshot("u1")).resolves.toBeNull();
    await expect(missing.clearChatCache()).resolves.toBeUndefined();
  });

  it("degrades to null when open() throws (e.g. some private windows)", async () => {
    globalThis.indexedDB = {
      open: () => {
        throw new DOMException("denied", "SecurityError");
      },
    } as unknown as IDBFactory;
    jest.resetModules();
    const blocked = await import("@/lib/chatCache");

    await expect(blocked.saveChatSnapshot(snapshot("u1", [msg("1")]))).resolves.toBeUndefined();
    await expect(blocked.loadChatSnapshot("u1")).resolves.toBeNull();
  });
});
