"use client";
import { Check, Loader2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RootState } from "@/redux/store";

/** Mirrors the limits the socket server enforces. */
export const MAX_FORWARD_CHATS = 5;
export const MAX_FORWARD_MESSAGES = 20;

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
      if (current.length >= MAX_FORWARD_CHATS) {
        toast.error(`You can forward to up to ${MAX_FORWARD_CHATS} chats at once`);
        return current;
      }
      return [...current, id];
    });

  const send = () => {
    if (!socket || sending || selected.length === 0) return;
    setSending(true);
    socket.timeout(30_000).emit(
      "forwardMessages",
      { messageIds, chatIds: selected },
      (timedOut: Error | null, result?: ForwardAck) => {
        setSending(false);
        if (timedOut || !result) {
          toast.error("Forwarding is taking too long. Check the chats before trying again.");
          return;
        }
        const failed = result.results?.filter((r) => !r.ok) ?? [];
        if (!result.ok) {
          toast.error(result.error ?? failed[0]?.error ?? "Could not forward messages");
          return;
        }
        if (failed.length > 0) {
          toast.warning(`Forwarded, but ${failed.length} chat(s) failed`, {
            description: failed[0]?.error,
          });
        } else {
          toast.success(messageIds.length === 1 ? "Message forwarded" : "Messages forwarded");
        }
        onForwarded();
        onOpenChange(false);
      }
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Forward to</DialogTitle>
        <DialogDescription>
          {messageIds.length} {messageIds.length === 1 ? "message" : "messages"} selected. Choose up
          to {MAX_FORWARD_CHATS} chats.
        </DialogDescription>
      </DialogHeader>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search chats"
        autoComplete="off"
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-600 dark:bg-neutral-800"
      />

      <ul className="max-h-72 space-y-1 overflow-y-auto">
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
          disabled={sending || selected.length === 0 || !socket}
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
  <Dialog open={props.open} onOpenChange={props.onOpenChange}>
    <DialogContent className="max-w-md">
      {/* Mounted only while open, so the selection always starts empty. */}
      <ForwardForm {...props} />
    </DialogContent>
  </Dialog>
);

export default ForwardDialog;
