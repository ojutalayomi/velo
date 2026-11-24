import { useEffect, useRef } from "react";
import { useStore } from "react-redux";
import type { Socket } from "socket.io-client";

import { convoPreviewUpdate } from "@/lib/chatPreview";
import { flushOutbox, listQueued } from "@/lib/outbox";
import type { MessageAttributes } from "@/lib/types/type";
import { addMessage, updateConversation, updateMessage } from "@/redux/chatSlice";
import { useAppDispatch } from "@/redux/hooks";
import type { RootState } from "@/redux/store";

/** While anything waits, look again this often (a send can be lost without any event). */
const RETRY_EVERY_MS = 15_000;

/**
 * Brings back messages written offline and sends them when the connection is there.
 *
 * - After the chats have loaded it shows waiting messages again (they were never part of the
 *   server's chat data, so a reload would otherwise make them vanish) as "sending".
 * - It sends them when the socket connects, when the browser comes back online, and every
 *   few seconds while any are left. Removal happens elsewhere, when the server's copy arrives.
 * - After too many attempts a message is marked as failed.
 */
export function useOutbox(userId: string | undefined, socket: Socket | null, chatsLoading: boolean) {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const shownFor = useRef("");

  // Show what is waiting, once the chat list it belongs to is in place.
  useEffect(() => {
    if (!userId || chatsLoading || shownFor.current === userId) return;
    shownFor.current = userId;
    let cancelled = false;
    void (async () => {
      const rows = await listQueued(userId);
      if (cancelled) return;
      for (const row of rows) {
        const message = row.message as unknown as MessageAttributes;
        const state = store.getState().chat;
        if (state.messages.some((m) => m._id === message._id)) continue;
        if (!state.conversations.some((c) => c.id === message.chatId)) continue;
        dispatch(addMessage({ ...message, status: "sending" }));
        dispatch(
          updateConversation({
            id: String(message.chatId),
            updates: { ...convoPreviewUpdate(message), lastUpdated: message.timestamp },
          })
        );
      }
    })();
    return () => {
      cancelled = true;
      shownFor.current = "";
    };
  }, [userId, chatsLoading, dispatch, store]);

  // Send what is waiting.
  useEffect(() => {
    if (!userId || !socket) return;
    let busy = false;

    const flush = async () => {
      if (busy || !socket.connected || !navigator.onLine) return;
      busy = true;
      try {
        const { failed } = await flushOutbox({
          userId,
          emit: (message) => socket.emit("chatMessage", message),
        });
        for (const id of failed) dispatch(updateMessage({ id, updates: { status: "failed" } }));
      } finally {
        busy = false;
      }
    };

    void flush();
    socket.on("connect", flush);
    window.addEventListener("online", flush);
    const timer = setInterval(flush, RETRY_EVERY_MS);
    return () => {
      socket.off("connect", flush);
      window.removeEventListener("online", flush);
      clearInterval(timer);
    };
  }, [userId, socket, dispatch]);
}
