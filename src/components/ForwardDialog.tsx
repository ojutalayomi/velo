"use client";
import { Check, CircleDashed, Loader2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "@/lib/toast";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { statusForwardBlockReason } from "@/lib/statusForward";
import { RootState } from "@/redux/store";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";

/** Mirrors the limits the socket server enforces. */
export const MAX_FORWARD_CHATS = 5;
export const MAX_FORWARD_MESSAGES = 20;

/** Stand-in row for the user's own status; it is never sent to the socket as a chat id. */
const STATUS_TARGET = "__my_status__";

type ForwardAck = {
  ok: boolean;
  error?: string;
  results?: { chatId: string; ok: boolean; error?: string }[];
};

interface Props {
  messageIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onForwarded: () => void;
}

const ForwardForm: React.FC<Props> = ({ messageIds, onOpenChange, onForwarded }) => {
  const socket = useSocket();
  const { userdata } = useUser();
  const conversations = useSelector((state: RootState) => state.chat.conversations);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const messages = useSelector((state: RootState) => state.chat.messages);

  // A message can be added to status one at a time, and only the kinds a status can show.
  const canShareToStatus = useMemo(() => {
    if (messageIds.length !== 1) return false;
    const m = messages?.find((x) => String(x._id) === messageIds[0]);
    if (!m) return false;
    return (
      statusForwardBlockReason({
        messageType: m.messageType,
        content: m.content,
        attachmentCount: m.attachments?.length ?? 0,
        viewOnce: Boolean((m as { viewOnce?: boolean }).viewOnce),
      }) === null
    );
  }, [messages, messageIds]);

  const chats = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return conversations
      .filter((c) => !c.deleted)
      // Announcement groups only accept messages from admins.
      .filter((c) => !c.onlyAdminsCanSend || c.adminIds?.includes(userdata._id))
      .filter((c) => !needle || c.name.toLowerCase().includes(needle))
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  }, [conversations, query, userdata._id]);

  const toggle = (id: string) =>
    setSelected((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (id !== STATUS_TARGET && current.filter((x) => x !== STATUS_TARGET).length >= MAX_FORWARD_CHATS) {
        toast.error(`You can forward to up to ${MAX_FORWARD_CHATS} chats at once`);
        return current;
      }
      return [...current, id];
    });

  const send = async () => {
    if (sending || selected.length === 0) return;
    const chatIds = selected.filter((id) => id !== STATUS_TARGET);
    const toStatus = selected.includes(STATUS_TARGET);
    if (chatIds.length > 0 && !socket) return;
    setSending(true);

    const statusDone = toStatus
      ? fetch("/api/statuses/forward", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: messageIds[0] }),
        })
          .then(async (res) => (res.ok ? null : ((await res.json().catch(() => ({}))).message as string) || "Couldn't add to status"))
          .catch(() => "Couldn't add to status")
      : Promise.resolve(null);

    type ChatOutcome = { sent: boolean; error?: string };
    const chatsDone: Promise<ChatOutcome> =
      chatIds.length === 0
        ? Promise.resolve({ sent: false })
        : new Promise((resolve) => {
            socket!.timeout(30_000).emit(
              "forwardMessages",
              { messageIds, chatIds },
              (timedOut: Error | null, result?: ForwardAck) => {
                if (timedOut || !result) {
                  resolve({ sent: false, error: "Forwarding is taking too long. Check the chats before trying again." });
                  return;
                }
                const failed = result.results?.filter((r) => !r.ok) ?? [];
                if (!result.ok) {
                  resolve({ sent: false, error: result.error ?? failed[0]?.error ?? "Could not forward messages" });
                  return;
                }
                if (failed.length > 0) {
                  toast.warning(`Forwarded, but ${failed.length} chat(s) failed`, { description: failed[0]?.error });
                }
                resolve({ sent: true });
              }
            );
          });

    const [statusError, chats] = await Promise.all([statusDone, chatsDone]);
    setSending(false);
    if (chats.error) toast.error(chats.error);
    if (statusError) toast.error(statusError);

    const sentStatus = toStatus && !statusError;
    // Stay open when nothing went through, so the user can retry.
    if (!chats.sent && !sentStatus) return;
    toast.success(
      chats.sent && sentStatus
        ? "Forwarded and added to your status"
        : sentStatus
          ? "Added to your status"
          : messageIds.length === 1
            ? "Message forwarded"
            : "Messages forwarded"
    );
    onForwarded();
    onOpenChange(false);
  };

  return (
    <>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Forward to</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          {messageIds.length} {messageIds.length === 1 ? "message" : "messages"} selected. Choose up
          to {MAX_FORWARD_CHATS} chats{canShareToStatus ? ", or add it to your status" : ""}.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search chats"
        autoComplete="off"
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-600 dark:bg-neutral-800"
      />

      <ul className="max-h-72 space-y-1 overflow-y-auto">
        {canShareToStatus && (
          <li>
            <button
              type="button"
              onClick={() => toggle(STATUS_TARGET)}
              aria-pressed={selected.includes(STATUS_TARGET)}
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-100 dark:hover:bg-neutral-800"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-brand/10 text-brand">
                <CircleDashed className="size-5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">My status</span>
              <span
                className={`flex size-5 items-center justify-center rounded-full border ${selected.includes(STATUS_TARGET) ? "border-brand bg-brand text-white" : "border-gray-300"}`}
              >
                {selected.includes(STATUS_TARGET) && <Check className="size-3.5" />}
              </span>
            </button>
          </li>
        )}
        {chats.map((chat) => {
          const checked = selected.includes(chat.id);
          return (
            <li key={chat.id}>
              <button
                type="button"
                onClick={() => toggle(chat.id)}
                aria-pressed={checked}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-100 dark:hover:bg-neutral-800"
              >
                <Avatar className="size-9">
                  <AvatarFallback>{chat.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  <AvatarImage src={chat.displayPicture} className="object-cover" alt="" />
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{chat.name}</span>
                <span
                  className={`flex size-5 items-center justify-center rounded-full border ${checked ? "border-brand bg-brand text-white" : "border-gray-300"}`}
                >
                  {checked && <Check className="size-3.5" />}
                </span>
              </button>
            </li>
          );
        })}
        {chats.length === 0 && (
          <li className="p-4 text-center text-sm text-gray-500">No chats to forward to</li>
        )}
      </ul>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={sending}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={send}
          disabled={sending || selected.length === 0 || (!socket && selected.some((id) => id !== STATUS_TARGET))}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending && <Loader2 className="size-4 animate-spin" />}
          Forward{selected.length ? ` (${selected.length})` : ""}
        </button>
      </div>
    </>
  );
};

const ForwardDialog: React.FC<Props> = (props) => (
  <ResponsiveDialog open={props.open} onOpenChange={props.onOpenChange}>
    <ResponsiveDialogContent className="max-w-md">
      {/* Mounted only while open, so the selection always starts empty. */}
      <ForwardForm {...props} />
    </ResponsiveDialogContent>
  </ResponsiveDialog>
);

export default ForwardDialog;
