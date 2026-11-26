"use client";
import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "@/lib/toast";

import { useSocket } from "@/app/providers/SocketProvider";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type DeleteChatKind = "group" | "direct" | "personal";

interface Props {
  chatId: string;
  /** The group's name, or the other person's name for a direct chat. */
  name: string;
  kind: DeleteChatKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

const COPY: Record<DeleteChatKind, (name: string) => { title: string; body: string; action: string; done: string; failed: string }> = {
  group: (name) => ({
    title: `Delete ${name}?`,
    body: "This permanently deletes the group, all of its messages and files for every member. It cannot be undone.",
    action: "Delete group",
    done: `${name} was deleted`,
    failed: "Could not delete the group",
  }),
  direct: (name) => ({
    title: `Delete chat with ${name}?`,
    body: `This permanently deletes the conversation, all of its messages and files for both you and ${name}. It cannot be undone.`,
    action: "Delete chat",
    done: "Chat deleted",
    failed: "Could not delete the chat",
  }),
  personal: () => ({
    title: "Delete your saved messages?",
    body: "This permanently deletes everything in this chat. It cannot be undone.",
    action: "Delete chat",
    done: "Chat deleted",
    failed: "Could not delete the chat",
  }),
};

/**
 * Permanently deletes a chat after confirmation. The server decides who may: members for direct
 * chats (it removes the chat for everyone in it), admins only for groups.
 */
const DeleteChatDialog: React.FC<Props> = ({ chatId, name, kind, open, onOpenChange, onDeleted }) => {
  const copy = COPY[kind](name);
  const socket = useSocket();
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = () => {
    if (isDeleting) return;
    if (!socket) {
      toast.error(copy.failed, { description: "You are offline. Try again." });
      return;
    }
    setIsDeleting(true);
    socket
      .timeout(20_000)
      .emit(
        "updateConversation",
        { id: chatId, updates: { deleted: true, convo: true } },
        (error: Error | null, result?: { ok: boolean; error?: string }) => {
          setIsDeleting(false);
          if (error || !result?.ok) {
            toast.error(copy.failed, {
              description: result?.error ?? "The server did not respond. Please try again.",
            });
            return;
          }
          toast.success(copy.done);
          onOpenChange(false);
          onDeleted();
        }
      );
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isDeleting && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <button
            type="button"
            onClick={remove}
            disabled={isDeleting}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50"
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            {copy.action}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteChatDialog;
