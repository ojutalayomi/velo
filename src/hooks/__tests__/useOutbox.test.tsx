import { deserialize, serialize } from "node:v8";

import "fake-indexeddb/auto";
import { configureStore } from "@reduxjs/toolkit";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";

import { useOutbox } from "@/hooks/useOutbox";
import * as outbox from "@/lib/outbox";
import chatReducer, { setConversations, setLoading } from "@/redux/chatSlice";

if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = <T,>(value: T): T => deserialize(serialize(value));
}

class FakeSocket {
  connected = true;
  emitted: Array<Record<string, unknown>> = [];
  handlers = new Map<string, Set<() => void>>();
  emit = (_event: string, message: Record<string, unknown>) => {
    this.emitted.push(message);
  };
  on = (event: string, fn: () => void) => {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(fn);
  };
  off = (event: string, fn: () => void) => this.handlers.get(event)?.delete(fn);
  fire = (event: string) => this.handlers.get(event)?.forEach((fn) => fn());
}

const convo = { id: "c1", type: "Direct", name: "Ada", unread: 0, pinned: false, participants: ["u1", "u2"] };
const queuedMessage = (id: string, extra: Record<string, unknown> = {}) => ({
  _id: id,
  chatId: "c1",
  content: `hello ${id}`,
  messageType: "Text",
  attachments: [],
  reactions: [],
  sender: { id: "u1" },
  timestamp: "2026-02-01T10:00:00.000Z",
  status: "sending",
  ...extra,
});

function setup(socket: FakeSocket | null, loading = false) {
  const store = configureStore({
    reducer: { chat: chatReducer },
    middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
  });
  store.dispatch(setConversations([convo] as never));
  store.dispatch(setLoading(loading));
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const utils = renderHook(
    ({ chatsLoading }) => useOutbox("u1", socket as never, chatsLoading),
    { wrapper, initialProps: { chatsLoading: loading } }
  );
  return { store, ...utils };
}

beforeEach(async () => {
  // Empty the database between tests (the open connection closes itself on a version change).
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("velo-outbox");
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});

describe("useOutbox", () => {
  it("shows waiting messages again after a reload, as sending", async () => {
    await outbox.queueMessage("u1", queuedMessage("m1"));

    const { store } = setup(null);

    await waitFor(() => expect(store.getState().chat.messages.map((m) => m._id)).toEqual(["m1"]));
    expect(store.getState().chat.messages[0].status).toBe("sending");
    expect(store.getState().chat.conversations[0].lastMessage).toContain("hello m1");
  });

  it("waits for the chat list before showing them", async () => {
    await outbox.queueMessage("u1", queuedMessage("m1"));
    const { store, rerender } = setup(null, true);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(store.getState().chat.messages).toEqual([]);

    act(() => {
      store.dispatch(setLoading(false));
    });
    rerender({ chatsLoading: false });

    await waitFor(() => expect(store.getState().chat.messages).toHaveLength(1));
  });

  it("does not show a message twice, or one for a chat that is gone", async () => {
    await outbox.queueMessage("u1", queuedMessage("m1"));
    await outbox.queueMessage("u1", queuedMessage("orphan", { chatId: "gone" }));

    const { store, rerender } = setup(null);
    await waitFor(() => expect(store.getState().chat.messages).toHaveLength(1));
    rerender({ chatsLoading: false });

    expect(store.getState().chat.messages.map((m) => m._id)).toEqual(["m1"]);
  });

  it("sends waiting messages once connected", async () => {
    await outbox.queueMessage("u1", queuedMessage("m1"));
    jest.spyOn(Date, "now").mockReturnValue(Date.now() + 60_000);
    const socket = new FakeSocket();

    setup(socket as never);

    await waitFor(() => expect(socket.emitted.map((m) => m._id)).toEqual(["m1"]));
    jest.restoreAllMocks();
  });

  it("holds messages while disconnected and sends them when the socket connects", async () => {
    await outbox.queueMessage("u1", queuedMessage("m1"));
    jest.spyOn(Date, "now").mockReturnValue(Date.now() + 60_000);
    const socket = new FakeSocket();
    socket.connected = false;

    setup(socket as never);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(socket.emitted).toEqual([]);

    socket.connected = true;
    await act(async () => {
      socket.fire("connect");
    });

    await waitFor(() => expect(socket.emitted.map((m) => m._id)).toEqual(["m1"]));
    jest.restoreAllMocks();
  });

  it("marks a message failed after too many attempts", async () => {
    await outbox.queueMessage("u1", queuedMessage("m1"));
    const socket = new FakeSocket();
    let now = Date.now() + 60_000;
    const spy = jest.spyOn(Date, "now").mockImplementation(() => now);

    const { store } = setup(socket as never);
    await waitFor(() => expect(store.getState().chat.messages).toHaveLength(1));
    for (let i = 0; i < outbox.MAX_ATTEMPTS + 1; i += 1) {
      now += outbox.RETRY_GAP_MS + 1;
      await act(async () => {
        socket.fire("connect");
        await new Promise((r) => setTimeout(r, 20));
      });
    }

    await waitFor(() => expect(store.getState().chat.messages[0].status).toBe("failed"));
    expect(await outbox.listQueued("u1")).toEqual([]);
    spy.mockRestore();
  });
});
