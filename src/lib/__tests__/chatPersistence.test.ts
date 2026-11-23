import type { ChatChanges } from "@/lib/chatCache";
import type { ConvoType, MessageAttributes, NewChatSettings } from "@/lib/types/type";
import type { ChatStateLike } from "@/redux/chatPersistence";

const mockPersist = jest.fn();
jest.mock("@/lib/chatCache", () => ({
  persistChatChanges: (...args: unknown[]) => mockPersist(...args),
}));

type Mod = typeof import("@/redux/chatPersistence");
let mod: Mod;

const convo = (id: string, extra: Partial<ConvoType> = {}) =>
  ({ id, name: id, unread: 0, pinned: false, isTypingList: [], online: false, ...extra }) as unknown as ConvoType;
const message = (id: string, extra: Partial<MessageAttributes> = {}) =>
  ({ _id: id, chatId: "c1", content: id, status: "sent", attachments: [], ...extra }) as unknown as MessageAttributes;
const setting = (chatId: string) => ({ chatId, isMuted: false }) as unknown as NewChatSettings;

const state = (patch: Partial<ChatStateLike> = {}): ChatStateLike => ({
  conversations: [],
  settings: {},
  messages: [],
  userId: "u1",
  loading: false,
  ...patch,
});

function fakeStore(initial: ChatStateLike) {
  let current = { chat: initial };
  const listeners = new Set<() => void>();
  return {
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    getState: () => current,
    set(patch: Partial<ChatStateLike>) {
      current = { chat: { ...current.chat, ...patch } };
      listeners.forEach((l) => l());
    },
    listenerCount: () => listeners.size,
  };
}

const lastChanges = (): ChatChanges => mockPersist.mock.calls.at(-1)![0];

beforeEach(async () => {
  jest.useFakeTimers();
  mockPersist.mockReset();
  mockPersist.mockResolvedValue(true);
  jest.resetModules();
  mod = await import("@/redux/chatPersistence");
});

afterEach(() => {
  mod.resetChatPersistence();
  jest.useRealTimers();
});

describe("computeChanges", () => {
  it("writes everything, replacing the stores, when there is no baseline", () => {
    const { changes } = mod.computeChanges(
      state({
        conversations: [convo("c1")],
        settings: { c1: setting("c1") },
        messages: [message("1")],
      }),
      null
    );

    expect(changes.replaceAll).toBe(true);
    expect(changes.conversations?.put.map((c) => c.id)).toEqual(["c1"]);
    expect(Object.keys(changes.settings?.put ?? {})).toEqual(["c1"]);
    expect(changes.messages?.put.map((m) => m._id)).toEqual(["1"]);
  });

  it("skips redux's empty-id placeholder setting", () => {
    const { changes } = mod.computeChanges(state({ settings: { "": setting(""), c1: setting("c1") } }), null);
    expect(Object.keys(changes.settings?.put ?? {})).toEqual(["c1"]);
  });

  it("reports nothing when the state is unchanged", () => {
    const s = state({ conversations: [convo("c1")], settings: { c1: setting("c1") }, messages: [message("1")] });
    const { next } = mod.computeChanges(s, null);

    expect(mod.hasChanges(mod.computeChanges(s, next).changes)).toBe(false);
  });

  it("writes only the conversation that changed", () => {
    const a = convo("a");
    const b = convo("b");
    const { next } = mod.computeChanges(state({ conversations: [a, b] }), null);

    const { changes } = mod.computeChanges(
      state({ conversations: [a, convo("b", { unread: 3 })] }),
      next
    );

    expect(changes.replaceAll).toBe(false);
    expect(changes.conversations?.put.map((c) => [c.id, c.unread])).toEqual([["b", 3]]);
  });

  it("does not write for typing or online changes alone", () => {
    const before = convo("a");
    const { next } = mod.computeChanges(state({ conversations: [before] }), null);

    const typing = convo("a", {
      isTypingList: [{ id: "x", name: "x", displayPicture: "", username: "x", isTyping: true, chatId: "a" }],
      online: true,
    });

    expect(mod.hasChanges(mod.computeChanges(state({ conversations: [typing] }), next).changes)).toBe(false);
  });

  it("never stores typing or presence", () => {
    const stored = mod.persistableConversation(
      convo("a", {
        online: true,
        isTypingList: [{ id: "x", name: "x", displayPicture: "", username: "x", isTyping: true, chatId: "a" }],
      })
    );
    expect(stored.online).toBe(false);
    expect(stored.isTypingList).toEqual([]);
  });

  it("writes new or changed messages only, by reference", () => {
    const one = message("1");
    const two = message("2");
    const { next } = mod.computeChanges(state({ messages: [one, two] }), null);

    const { changes } = mod.computeChanges(
      state({ messages: [one, { ...two, content: "edited" }, message("3")] }),
      next
    );

    expect(changes.messages?.put.map((m) => m._id)).toEqual(["2", "3"]);
  });

  it("does not store messages that are still sending or failed", () => {
    const { changes } = mod.computeChanges(
      state({
        messages: [
          message("1"),
          message("2", { status: "sending" }),
          message("3", { status: "failed" }),
          message("4", { status: "delivered" }),
        ],
      }),
      null
    );
    expect(changes.messages?.put.map((m) => m._id)).toEqual(["1", "4"]);
  });

  it("stores a message once it finishes sending, and drops it if it goes back to failed", () => {
    const sending = message("1", { status: "sending" });
    const first = mod.computeChanges(state({ messages: [sending] }), null);
    expect(first.changes.messages?.put).toEqual([]);

    const sent = mod.computeChanges(state({ messages: [{ ...sending, status: "sent" }] }), first.next);
    expect(sent.changes.messages?.put.map((m) => m._id)).toEqual(["1"]);

    const failed = mod.computeChanges(state({ messages: [{ ...sending, status: "failed" }] }), sent.next);
    expect(failed.changes.messages?.remove).toEqual(["1"]);
  });

  it("strips raw file bytes from attachments but keeps the rest", () => {
    const original = message("1", {
      attachments: [{ key: "k", name: "a.png", type: "image/png", url: "https://x/k", data: [1, 2, 3] }],
    });

    const stored = mod.persistableMessage(original);

    expect(stored.attachments[0]).toEqual({ key: "k", name: "a.png", type: "image/png", url: "https://x/k" });
    expect(original.attachments[0]).toHaveProperty("data"); // redux state is not mutated
  });

  it("removes rows that left the state", () => {
    const { next } = mod.computeChanges(
      state({
        conversations: [convo("a"), convo("b")],
        settings: { a: setting("a"), b: setting("b") },
        messages: [message("1"), message("2")],
      }),
      null
    );

    const { changes } = mod.computeChanges(
      state({ conversations: [convo("a")], settings: { a: setting("a") }, messages: [message("1")] }),
      next
    );

    expect(changes.conversations?.remove).toEqual(["b"]);
    expect(changes.settings?.remove).toEqual(["b"]);
    // message("1") is a new object here, so it is rewritten; "2" is gone.
    expect(changes.messages?.remove).toEqual(["2"]);
  });
});

describe("startChatPersistence", () => {
  it("batches rapid changes into one write", async () => {
    const store = fakeStore(state());
    const stop = mod.startChatPersistence(store, 500);

    store.set({ conversations: [convo("a")] });
    await jest.advanceTimersByTimeAsync(200);
    store.set({ conversations: [convo("a"), convo("b")] });
    await jest.advanceTimersByTimeAsync(499);
    expect(mockPersist).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);

    expect(mockPersist).toHaveBeenCalledTimes(1);
    expect(lastChanges().conversations?.put.map((c) => c.id)).toEqual(["a", "b"]);
    stop();
  });

  it("replaces on the first write of a session, then writes only differences", async () => {
    const a = convo("a");
    const store = fakeStore(state({ conversations: [a] }));
    mod.startChatPersistence(store, 500);

    await jest.advanceTimersByTimeAsync(500);
    expect(lastChanges().replaceAll).toBe(true);

    store.set({ conversations: [a, convo("b")] });
    await jest.advanceTimersByTimeAsync(500);

    expect(mockPersist).toHaveBeenCalledTimes(2);
    expect(lastChanges().replaceAll).toBe(false);
    expect(lastChanges().conversations?.put.map((c) => c.id)).toEqual(["b"]);
  });

  it("does not write while loading or before a user is set", async () => {
    const store = fakeStore(state({ userId: "", loading: true, conversations: [convo("a")] }));
    mod.startChatPersistence(store, 500);

    store.set({ userId: "u1" }); // still loading
    await jest.advanceTimersByTimeAsync(500);
    expect(mockPersist).not.toHaveBeenCalled();

    store.set({ loading: false });
    await jest.advanceTimersByTimeAsync(500);
    expect(mockPersist).toHaveBeenCalledTimes(1);
  });

  it("retries as a full replace after a failed write", async () => {
    const a = convo("a");
    const store = fakeStore(state({ conversations: [a] }));
    mod.startChatPersistence(store, 500);
    mockPersist.mockResolvedValueOnce(false);

    await jest.advanceTimersByTimeAsync(500);
    store.set({ conversations: [a, convo("b")] });
    await jest.advanceTimersByTimeAsync(500);

    expect(mockPersist).toHaveBeenCalledTimes(2);
    expect(lastChanges().replaceAll).toBe(true);
    expect(lastChanges().conversations?.put.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("stops writing and unsubscribes when stopped", async () => {
    const store = fakeStore(state());
    const stop = mod.startChatPersistence(store, 500);
    stop();

    store.set({ conversations: [convo("a")] });
    await jest.advanceTimersByTimeAsync(500);

    expect(store.listenerCount()).toBe(0);
    expect(mockPersist).not.toHaveBeenCalled();
  });
});

describe("flushChatPersistence", () => {
  it("writes pending changes immediately and reports they are stored", async () => {
    const store = fakeStore(state({ conversations: [convo("a")] }));
    mod.startChatPersistence(store, 500);

    await expect(mod.flushChatPersistence()).resolves.toBe(true);
    expect(mockPersist).toHaveBeenCalledTimes(1);
  });

  it("reports false when nothing is stored, so the sync cursor is not recorded", async () => {
    // Not started.
    await expect(mod.flushChatPersistence()).resolves.toBe(false);

    // Started but still loading.
    const store = fakeStore(state({ loading: true }));
    mod.startChatPersistence(store, 500);
    await expect(mod.flushChatPersistence()).resolves.toBe(false);
  });

  it("reports false when the write fails", async () => {
    mockPersist.mockResolvedValue(false);
    const store = fakeStore(state({ conversations: [convo("a")] }));
    mod.startChatPersistence(store, 500);

    await expect(mod.flushChatPersistence()).resolves.toBe(false);
  });
});

describe("resetChatPersistence (logout)", () => {
  it("stops writing the previous user's state until fresh data has been fetched", async () => {
    const store = fakeStore(state({ conversations: [convo("a")] }));
    mod.startChatPersistence(store, 500);
    await jest.advanceTimersByTimeAsync(500);
    mockPersist.mockClear();

    mod.resetChatPersistence();
    store.set({ conversations: [convo("a"), convo("b")] }); // redux still holds the old user's chats
    await jest.advanceTimersByTimeAsync(500);
    expect(mockPersist).not.toHaveBeenCalled();

    // A successful fetch applies new data and flushes: writing resumes, from scratch.
    await mod.flushChatPersistence();
    expect(mockPersist).toHaveBeenCalledTimes(1);
    expect(lastChanges().replaceAll).toBe(true);
  });

  it("cancels a write that was already scheduled", async () => {
    const store = fakeStore(state());
    mod.startChatPersistence(store, 500);
    store.set({ conversations: [convo("a")] });

    mod.resetChatPersistence();
    await jest.advanceTimersByTimeAsync(500);

    expect(mockPersist).not.toHaveBeenCalled();
  });
});
