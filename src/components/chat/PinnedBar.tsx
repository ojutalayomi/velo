"use client";

import { Pin, PinOff, List } from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "@/lib/toast";

import { useSocket } from "@/app/providers/SocketProvider";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { useUser } from "@/app/providers/UserProvider";
import { canPinMessages } from "@/lib/pinRules";
import { messageText } from "@/lib/polls";
import type { RootState } from "@/redux/store";

/** Scroll to a message in the open chat and flash it, like tapping a quote does. */
export function jumpToMessage(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("bg-brand/20", "py-2");
  setTimeout(() => el.classList.remove("bg-brand/20", "py-2"), 2000);
  return true;
}

/**
 * Pinned messages strip under the chat header. Shows one pin at a time ("n of N"); tapping it
 * jumps to that message and moves on to the next pin. The list button shows all of them.
 */
export function PinnedBar({ chatId }: { chatId: string }) {
  const socket = useSocket();
  const { userdata } = useUser();
  const convo = useSelector((s: RootState) => s.chat.conversations.find((c) => c.id === chatId));
  const messages = useSelector((s: RootState) => s.chat.messages);
  const [index, setIndex] = useState(0);
  const [listOpen, setListOpen] = useState(false);

  const pins = convo?.pinnedMessages ?? [];
  if (pins.length === 0) return null;

  const canUnpin = canPinMessages({
    chatType: convo?.type,
    adminIds: convo?.adminIds,
    userId: userdata._id,
  });
  const current = pins[Math.min(index, pins.length - 1)];
  const labelFor = (messageId: string) => {
    const m = messages?.find((x) => String(x._id) === messageId);
    return m ? messageText(m) || "Attachment" : "Pinned message";
  };
  const open = (messageId: string) => {
    if (!jumpToMessage(messageId)) toast.info("Scroll up to load that message");
  };
  const unpin = (messageId: string) =>
    socket?.emit("unpinMessage", { chatId, messageId }, (res?: { ok: boolean; error?: string }) => {
      if (res && !res.ok) toast.error(res.error || "Couldn't unpin");
    });

  return (
    <>
      <div
        className="flex items-center gap-2 border-b bg-white/80 px-3 py-1.5 backdrop-blur-sm dark:bg-zinc-900/80"
        data-testid="pinned-bar"
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-label={`Pinned message ${pins.indexOf(current) + 1} of ${pins.length}`}
          onClick={() => {
            open(current.messageId);
            setIndex((i) => (i + 1) % pins.length);
          }}
        >
          <Pin className="size-4 shrink-0 text-brand" />
          <span className="flex min-w-0 flex-col">
            <span className="text-xs font-medium text-brand">
              {pins.length > 1 ? `Pinned ${pins.indexOf(current) + 1} of ${pins.length}` : "Pinned message"}
            </span>
            <span className="truncate text-sm">{labelFor(current.messageId)}</span>
          </span>
        </button>
        <button
          type="button"
          aria-label="All pinned messages"
          className="rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
          onClick={() => setListOpen(true)}
        >
          <List className="size-4" />
        </button>
      </div>

      <ResponsiveDialog open={listOpen} onOpenChange={setListOpen} mobile="drawer">
        <ResponsiveDialogContent className="max-h-[80vh] overflow-y-auto">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Pinned messages</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <ul className="flex flex-col gap-1 max-w-md pb-4">
            {pins.map((p) => (
              <li key={p.messageId} className="flex items-center gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate rounded-md px-2 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                  onClick={() => {
                    setListOpen(false);
                    setTimeout(() => open(p.messageId), 250);
                  }}
                >
                  {labelFor(p.messageId)}
                </button>
                {canUnpin && (
                  <button
                    type="button"
                    aria-label="Unpin"
                    className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
                    onClick={() => unpin(p.messageId)}
                  >
                    <PinOff className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
PinnedBar.displayName = "PinnedBar";
