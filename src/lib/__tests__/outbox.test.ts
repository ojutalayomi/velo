import { deserialize, serialize } from "node:v8";

import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = <T>(value: T): T => deserialize(serialize(value));
}

type Outbox = typeof import("@/lib/outbox");
let outbox: Outbox;

const msg = (id: string, extra: Record<string, unknown> = {}) => ({
  _id: id,
  chatId: "c1",
  content: `hello ${id}`,
  attachments: [],
  ...extra,
});

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  jest.resetModules();
  outbox = await import("@/lib/outbox");
});

describe("queueing", () => {
  it("keeps a message for its user, oldest first", async () => {
    await outbox.queueMessage("u1", msg("a"));
    await new Promise((r) => setTimeout(r, 5));
    await outbox.queueMessage("u1", msg("b"));

    const queued = await outbox.listQueued("u1");

    expect(queued.map((q) => q._id)).toEqual(["a", "b"]);
    expect(queued[0].message).toMatchObject({ content: "hello a", chatId: "c1" });
  });

  it("never lists another user's messages", async () => {
    await outbox.queueMessage("u1", msg("a"));
    expect(await outbox.listQueued("u2")).toEqual([]);
    expect(await outbox.listQueued("")).toEqual([]);
  });

  it("stores a plain copy of a class instance", async () => {
    class Msg {
      _id = "x";
      content = "hi";
      attachments: unknown[] = [];
      helper() {
        return 1;
      }
    }
    expect(await outbox.queueMessage("u1", new Msg())).toBe(true);
    expect((await outbox.listQueued("u1"))[0].message).toEqual({ _id: "x", content: "hi", attachments: [] });
  });

  it("queueing the same message twice keeps one", async () => {
    await outbox.queueMessage("u1", msg("a"));
    await outbox.queueMessage("u1", msg("a"));
    expect(await outbox.listQueued("u1")).toHaveLength(1);
  });

  it("refuses messages with files, or without an id or user", async () => {
    expect(await outbox.queueMessage("u1", msg("a", { attachments: [{ name: "f" }] }))).toBe(false);
    expect(await outbox.queueMessage("u1", { content: "no id" })).toBe(false);
    expect(await outbox.queueMessage("", msg("b"))).toBe(false);
    expect(await outbox.listQueued("u1")).toEqual([]);
    expect(outbox.canQueue(msg("a"))).toBe(true);
    expect(outbox.canQueue(msg("a", { attachments: [1] }))).toBe(false);
  });

  it("removes one message, or everything on clear", async () => {
    await outbox.queueMessage("u1", msg("a"));
    await outbox.queueMessage("u1", msg("b"));
    await outbox.removeQueued("a");
    expect((await outbox.listQueued("u1")).map((q) => q._id)).toEqual(["b"]);

    await outbox.clearOutbox();
    expect(await outbox.listQueued("u1")).toEqual([]);
  });
});

describe("flushOutbox", () => {
  const later = (ms: number) => Date.now() + ms;

  it("sends waiting messages in order and keeps them until the server's copy arrives", async () => {
    await outbox.queueMessage("u1", msg("a"));
    await new Promise((r) => setTimeout(r, 5));
    await outbox.queueMessage("u1", msg("b"));
    const emit = jest.fn();

    const result = await outbox.flushOutbox({ userId: "u1", emit, now: later(60_000) });

    expect(result).toEqual({ sent: ["a", "b"], failed: [] });
    expect(emit.mock.calls.map(([m]) => m._id)).toEqual(["a", "b"]);
    expect(await outbox.listQueued("u1")).toHaveLength(2);
  });

  it("does not resend a message that was sent a moment ago", async () => {
    await outbox.queueMessage("u1", msg("a"));
    const emit = jest.fn();

    await outbox.flushOutbox({ userId: "u1", emit });

    expect(emit).not.toHaveBeenCalled();
  });

  it("only sends the current user's messages", async () => {
    await outbox.queueMessage("u1", msg("mine"));
    await outbox.queueMessage("u2", msg("theirs"));
    const emit = jest.fn();

    await outbox.flushOutbox({ userId: "u1", emit, now: later(60_000) });

    expect(emit.mock.calls.map(([m]) => m._id)).toEqual(["mine"]);
  });

  it("gives up after the attempt limit and reports the message as failed", async () => {
    await outbox.queueMessage("u1", msg("a"));
    const emit = jest.fn();
    let now = later(60_000);

    for (let i = 0; i < outbox.MAX_ATTEMPTS; i += 1) {
      const sent = await outbox.flushOutbox({ userId: "u1", emit, now });
      expect(sent.sent).toEqual(["a"]);
      now += outbox.RETRY_GAP_MS + 1;
    }
    const last = await outbox.flushOutbox({ userId: "u1", emit, now });

    expect(last).toEqual({ sent: [], failed: ["a"] });
    expect(emit).toHaveBeenCalledTimes(outbox.MAX_ATTEMPTS);
    expect(await outbox.listQueued("u1")).toEqual([]);
  });

  it("leaves a message for the next pass when the socket throws", async () => {
    await outbox.queueMessage("u1", msg("a"));
    const emit = jest.fn(() => {
      throw new Error("not connected");
    });

    const result = await outbox.flushOutbox({ userId: "u1", emit, now: later(60_000) });

    expect(result).toEqual({ sent: [], failed: [] });
    expect((await outbox.listQueued("u1"))[0].attempts).toBe(0);
  });
});

describe("without IndexedDB", () => {
  const original = globalThis.indexedDB;
  afterEach(() => {
    globalThis.indexedDB = original;
  });

  it("is a harmless no-op", async () => {
    // @ts-expect-error simulate a browser without IndexedDB
    globalThis.indexedDB = undefined;
    jest.resetModules();
    const missing = await import("@/lib/outbox");

    expect(await missing.queueMessage("u1", msg("a"))).toBe(false);
    expect(await missing.listQueued("u1")).toEqual([]);
    await expect(missing.removeQueued("a")).resolves.toBeUndefined();
    await expect(missing.clearOutbox()).resolves.toBeUndefined();
    expect(await missing.flushOutbox({ userId: "u1", emit: jest.fn() })).toEqual({ sent: [], failed: [] });
  });
});
