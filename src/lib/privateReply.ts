import { canQuote } from "@/lib/messageActions";
import { messageText } from "@/lib/polls";
import type { ConvoType, MessageType } from "@/lib/types/type";

type Candidate = {
  chatType?: string;
  messageType?: MessageType;
  content?: string;
  status?: string;
  viewOnce?: boolean;
  sender?: { id?: string } | null;
};

/**
 * Why a group message can't be answered in private, or null when it can. Only another member's
 * message qualifies: there is no one to reply to on your own, and a deleted, system or unsent
 * message has nothing to quote.
 */
export function privateReplyBlockReason(message: Candidate, userId: string): string | null {
  if (message.chatType !== "Group") return "You can only reply privately to a group message";
  const senderId = message.sender?.id;
  if (!senderId || senderId === userId) return "You can't reply privately to your own message";
  if (!canQuote(message)) return "This message can't be replied to";
  if (message.status === "sending" || message.status === "failed") return "Wait until the message is sent";
  return null;
}

export const canReplyPrivately = (message: Candidate, userId: string) =>
  privateReplyBlockReason(message, userId) === null;

/** The existing one-to-one chat with `otherId`, if the conversation list has one. */
export function findDmWith(conversations: ConvoType[], userId: string, otherId: string): ConvoType | undefined {
  return conversations.find(
    (convo) =>
      convo.type === "DM" &&
      convo.participants.includes(otherId) &&
      (convo.participants.length === 1 || convo.participants.includes(userId))
  );
}

/**
 * Where a private reply goes: the DM if there is one, otherwise the new-chat screen for that person.
 * `target` is how that page recognises the reply meant for it.
 */
export function privateReplyRoute(
  conversations: ConvoType[],
  userId: string,
  otherId: string
): { route: string; target: string } {
  const dm = findDmWith(conversations, userId, otherId);
  return dm
    ? { route: `/chats/${dm.id}`, target: dm.id }
    : { route: `/chats/new?otherId=${encodeURIComponent(otherId)}`, target: `new:${otherId}` };
}

type Quotable = { _id?: unknown; content?: string; messageType?: string; viewOnce?: boolean; sender?: { id?: string } | null };

/**
 * The quote a chat page opens with when the person came from "Reply privately". `null` when the
 * pending reply is for some other page, or the message is no longer in the store.
 */
export function privateReplyQuote(
  pending: { messageId: string; target: string } | null,
  target: string,
  messages: Quotable[]
) {
  if (!pending || pending.target !== target) return null;
  const message = messages.find((m) => String(m._id) === pending.messageId);
  if (!message) return null;
  return {
    message: { _id: String(message._id), senderId: message.sender?.id ?? "", content: messageText(message) },
    state: true as const,
  };
}
