import { deleteMessage, updateConversation, updateMessage } from "@/redux/chatSlice";
import { RootState } from "@/redux/store";
import { useAppDispatch } from "@/redux/hooks";
import { clearSelectedMessages } from "@/redux/utilsSlice";
import { Forward, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import {
  ADMIN_DELETED_CONTENT,
  DELETED_MARKER,
  deletedPreview,
  messageDeletion,
  SENDER_DELETED_CONTENT,
} from "@/lib/messageDeletion";
import ForwardDialog, { MAX_FORWARD_MESSAGES } from "@/components/ForwardDialog";
import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";

export const MultiSelect = () => {
  const dispatch = useAppDispatch();
  const socket = useSocket();
  const { userdata } = useUser();
  const { messages, conversations } = useSelector((state: RootState) => state.chat);
  const { selectedMessages } = useSelector((state: RootState) => state.utils);

  const [forwardOpen, setForwardOpen] = useState(false);

  const forwardMessages = () => setForwardOpen(true);

  const deleteMessages = () => {
    if (!socket) return;
    const picked = selectedMessages
      .map((id) => messages.find((msg) => msg._id === id))
      .filter((msg): msg is NonNullable<typeof msg> => Boolean(msg));

    // The server decides; this mirrors its rule so the screen never shows a delete it will refuse.
    const deletable = picked
      .map((msg) => ({
        msg,
        deletion: messageDeletion({
          senderId: msg.sender?.id,
          userId: userdata._id,
          chatType: msg.chatType,
          adminIds: conversations.find((c) => c.id === msg.chatId)?.adminIds,
        }),
      }))
      .filter((entry): entry is { msg: (typeof picked)[number]; deletion: "sender" | "admin" } =>
        Boolean(entry.deletion)
      );
    const skipped = selectedMessages.length - deletable.length;
    if (deletable.length === 0) {
      toast.error("You can only delete your own messages");
      return;
    }

    for (const { msg, deletion } of deletable) {
      const id = String(msg._id);
      if (msg.content.endsWith(DELETED_MARKER)) {
        // Already deleted for everyone; just remove the leftover placeholder from this screen.
        dispatch(deleteMessage(id));
        continue;
      }
      const convo = conversations.find((c) => c.id === msg.chatId);
      if (convo && convo.lastMessage === msg.content) {
        dispatch(
          updateConversation({ id: msg.chatId, updates: { lastMessage: deletedPreview(deletion === "admin" ? ADMIN_DELETED_CONTENT : SENDER_DELETED_CONTENT) } })
        );
      }
      dispatch(
        updateMessage({
          id,
          updates: {
            attachments: [],
            content: deletion === "admin" ? ADMIN_DELETED_CONTENT : SENDER_DELETED_CONTENT,
          },
        })
      );
      socket.emit("updateConversation", { id, updates: { deleted: true } });
    }

    if (skipped > 0) {
      toast.info(
        `Deleted ${deletable.length}. ${skipped} message${skipped === 1 ? " was" : "s were"} not yours to delete, so ${skipped === 1 ? "it was" : "they were"} left alone.`
      );
    }
    dispatch(clearSelectedMessages());
  };

  const actions = [
    {
      label: "Forward",
      icon: Forward,
      onClick: forwardMessages,
      disabled: selectedMessages.length > MAX_FORWARD_MESSAGES,
      title:
        selectedMessages.length > MAX_FORWARD_MESSAGES
          ? `Select ${MAX_FORWARD_MESSAGES} messages or fewer to forward`
          : "Forward",
      danger: false,
    },
    { label: "Delete", icon: Trash2, onClick: deleteMessages, disabled: false, title: "Delete", danger: true },
  ];

  return (
    <div className="flex w-full items-center gap-2 border-t bg-white/90 px-3 py-2 backdrop-blur dark:border-neutral-800 dark:bg-zinc-900/90">
      <button
        type="button"
        aria-label="Cancel selection"
        onClick={() => dispatch(clearSelectedMessages())}
        className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800"
      >
        <X className="size-5" />
      </button>
      <span className="flex-1 text-sm font-medium" aria-live="polite">
        {selectedMessages.length} selected
      </span>
      <div className="flex items-center gap-1">
        {actions.map(({ label, icon: Icon, onClick, disabled, title, danger }) => (
          <button
            key={label}
            type="button"
            title={title}
            disabled={disabled}
            onClick={onClick}
            className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              danger
                ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-800"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>
      <ForwardDialog
        messageIds={selectedMessages}
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        onForwarded={() => dispatch(clearSelectedMessages())}
      />
    </div>
  );
};
