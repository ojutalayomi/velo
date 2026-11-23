import { deserialize, serialize } from "node:v8";

import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

import type { ConvoType, MessageAttributes, NewChatSettings } from "@/lib/types/type";

// jest-environment-jsdom has no structuredClone, which fake-indexeddb uses to copy stored values.
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = <T>(value: T): T => deserialize(serialize(value));
}

type CacheModule = typeof import("@/lib/chatCache");

const msg = (id: string, chatId = "c1") =>
  ({ _id: id, chatId, content: `m${id}`, timestamp: "2026-01-01T00:00:00.000Z" }) as
    unknown as MessageAttributes;
const convo = (id: string, extra: Partial<ConvoType> = {}) =>
  ({ id, name: `chat ${id}`, unread: 0, pinned: false, ...extra }) as unknown as ConvoType;
const setting = (chatId: string, isMuted = false) =>
  ({ chatId, isMuted }) as unknown as NewChatSettings;

let cache: CacheModule;

/** Rows first, then the meta record, the same order the app uses. */
async function seed(
  userId: string,
  data: { messages?: MessageAttributes[]; conversations?: ConvoType[]; settings?: Record<string, NewChatSettings> },
  meta: { serverTime?: string } = {}
) {
  await cache.persistChatChanges({
    replaceAll: true,
    messages: { put: data.messages ?? [], remove: [] },
    conversations: { put: data.conversations ?? [], remove: [] },
    settings: { put: data.settings ?? {}, remove: [] },
  });
  await cache.saveChatMeta({
    requestId: userId,
    pagination: { messages: { skip: 0, limit: 500, hasMore: false } },
    ...meta,
  });
}

const ids = (rows?: Array<{ _id?: string; id?: string }>) =>
  (rows ?? []).map((r) => r._id ?? r.id).sort();

beforeEach(async () => {
  // A fresh database and a fresh module (it memoises the open connection) for every test.
  globalThis.indexedDB = new IDBFactory();
  jest.resetModules();
  cache = await import("@/lib/chatCache");
});

describe("chatCache", () => {
  it("round-trips conversations, settings, messages and meta for the same user", async () => {
    await seed(
      "u1",
      {
        messages: [msg("1"), msg("2")],
        conversations: [convo("c1"), convo("c2")],
        settings: { c1: setting("c1", true) },
      },
      { serverTime: "2026-06-10T12:00:00.000Z" }
    );
    const loaded = await cache.loadChatSnapshot("u1");

    expect(loaded?.requestId).toBe("u1");
    expect(ids(loaded?.messages)).toEqual(["1", "2"]);
    expect(ids(loaded?.conversations)).toEqual(["c1", "c2"]);
    expect(loaded?.chatSettings).toEqual({ c1: setting("c1", true) });
    expect(loaded?.serverTime).toBe("2026-06-10T12:00:00.000Z");
    expect(loaded?.pagination?.messages.hasMore).toBe(false);
    expect(loaded).not.toHaveProperty("savedAt");
  });

  it("never returns another user's snapshot", async () => {
    await seed("u1", { messages: [msg("1")] });
    expect(await cache.loadChatSnapshot("u2")).toBeNull();
    expect(await cache.loadChatSnapshot("")).toBeNull();
  });

  it("returns null when nothing has been saved", async () => {
    expect(await cache.loadChatSnapshot("u1")).toBeNull();
  });

  it("returns null when rows exist but no meta was recorded (the cursor is written last)", async () => {
    await cache.persistChatChanges({
      replaceAll: true,
      messages: { put: [msg("1")], remove: [] },
    });
    expect(await cache.loadChatSnapshot("u1")).toBeNull();
  });

  it("ignores meta without a requestId", async () => {
    await cache.saveChatMeta({ requestId: "" });
    expect(await cache.loadChatSnapshot("")).toBeNull();
  });

  it("ignores messages and conversations without an id", async () => {
    await cache.persistChatChanges({
      replaceAll: true,
      messages: { put: [msg("1"), { content: "no id" } as never], remove: [] },
      conversations: { put: [convo("c1"), { name: "no id" } as never], remove: [] },
    });
    await cache.saveChatMeta({ requestId: "u1" });
    const loaded = await cache.loadChatSnapshot("u1");

    expect(loaded?.messages).toHaveLength(1);
    expect(loaded?.conversations).toHaveLength(1);
  });

  describe("incremental writes", () => {
    it("updates and removes individual rows without touching the rest", async () => {
      await seed("u1", {
        messages: [msg("1"), msg("2")],
        conversations: [convo("c1"), convo("c2")],
        settings: { c1: setting("c1"), c2: setting("c2") },
      });

      await cache.persistChatChanges({
        messages: { put: [msg("3")], remove: ["1"] },
        conversations: { put: [convo("c1", { pinned: true })], remove: ["c2"] },
        settings: { put: { c1: setting("c1", true) }, remove: ["c2"] },
      });
      const loaded = await cache.loadChatSnapshot("u1");

      expect(ids(loaded?.messages)).toEqual(["2", "3"]);
      expect(loaded?.conversations).toEqual([convo("c1", { pinned: true })]);
      expect(loaded?.chatSettings).toEqual({ c1: setting("c1", true) });
    });

    it("replaceAll wipes rows that are no longer in the new set", async () => {
      await seed("u1", { messages: [msg("1"), msg("2")], conversations: [convo("c1")] });

      await cache.persistChatChanges({
        replaceAll: true,
        messages: { put: [msg("2"), msg("3")], remove: [] },
      });
      const loaded = await cache.loadChatSnapshot("u1");

      expect(ids(loaded?.messages)).toEqual(["2", "3"]);
      expect(loaded?.conversations).toEqual([]);
    });

    it("reports whether the write was stored", async () => {
      expect(await cache.persistChatChanges({ replaceAll: true })).toBe(true);
    });
  });

  it("clearChatCache removes every store, including meta", async () => {
    await seed("u1", {
      messages: [msg("1")],
      conversations: [convo("c1")],
      settings: { c1: setting("c1") },
    });
    await cache.clearChatCache();

    expect(await cache.loadChatSnapshot("u1")).toBeNull();
    // Rows are gone too, not just the meta that gates reading them.
    await cache.saveChatMeta({ requestId: "u1" });
    const loaded = await cache.loadChatSnapshot("u1");
    expect(loaded?.messages).toEqual([]);
    expect(loaded?.conversations).toEqual([]);
    expect(loaded?.chatSettings).toEqual({});
  });
});

describe("upgrading a v1 database", () => {
  /** A database as the first release created it: messages + one combined meta snapshot. */
  async function createV1(userId: string) {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("velo-chat-cache", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore("messages", { keyPath: "_id" }).createIndex("chatId", "chatId");
        db.createObjectStore("meta");
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(["messages", "meta"], "readwrite");
        tx.objectStore("messages").put(msg("old"));
        tx.objectStore("meta").put(
          { requestId: userId, chats: [{ _id: "c1" }], chatSettings: {}, savedAt: 1 },
          "snapshot"
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }

  it("drops the old combined snapshot, so the next load is a full fetch", async () => {
    await createV1("u1");
    jest.resetModules();
    cache = await import("@/lib/chatCache");

    expect(await cache.loadChatSnapshot("u1")).toBeNull();
  });

  it("creates the new stores so writes work after the upgrade", async () => {
    await createV1("u1");
    jest.resetModules();
    cache = await import("@/lib/chatCache");

    await seed("u1", { conversations: [convo("c1")], settings: { c1: setting("c1") } });
    const loaded = await cache.loadChatSnapshot("u1");

    expect(ids(loaded?.conversations)).toEqual(["c1"]);
    expect(loaded?.chatSettings).toEqual({ c1: setting("c1") });
    // The first write of a session replaces everything, so the v1 message is gone.
    expect(loaded?.messages).toEqual([]);
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
    await expect(missing.persistChatChanges({ replaceAll: true })).resolves.toBe(false);
    await expect(missing.saveChatMeta({ requestId: "u1" })).resolves.toBeUndefined();
    await expect(missing.loadChatSnapshot("u1")).resolves.toBeNull();
    await expect(missing.clearChatCache()).resolves.toBeUndefined();
  });

  it("degrades to null/false when open() throws (e.g. some private windows)", async () => {
    globalThis.indexedDB = {
      open: () => {
        throw new DOMException("denied", "SecurityError");
      },
    } as unknown as IDBFactory;
    jest.resetModules();
    const blocked = await import("@/lib/chatCache");

    await expect(blocked.persistChatChanges({ replaceAll: true })).resolves.toBe(false);
    await expect(blocked.saveChatMeta({ requestId: "u1" })).resolves.toBeUndefined();
    await expect(blocked.loadChatSnapshot("u1")).resolves.toBeNull();
  });
});
