import { DELETED_MARKER } from "@/lib/messageDeletion";
import type { MessageType } from "@/lib/types/type";

/**
 * Message types that only make sense in the chat they were sent in: a call record, a poll (with its
 * votes and results), a chat announcement. They are never forwarded. The socket server enforces the
 * same list (velo-socket `forwardRules.ts`), so keep the two in step.
 */
export const NON_FORWARDABLE_TYPES: MessageType[] = [
  "Call",
  "Poll",
  "PollResponse",
  "PollEnd",
  "PollResult",
  "Announcement",
];

type Candidate = {
  messageType?: MessageType;
  content?: string;
  status?: string;
  attachments?: unknown[];
  viewOnce?: boolean;
};

const isDeleted = (message: Candidate) => (message.content ?? "").endsWith(DELETED_MARKER);

/** Why a message can't be forwarded, or null when it can. */
export function forwardBlockReason(message: Candidate): string | null {
  if (message.messageType && NON_FORWARDABLE_TYPES.includes(message.messageType)) {
    return message.messageType === "Call"
      ? "Calls can't be forwarded"
      : message.messageType === "Announcement"
        ? "Announcements can't be forwarded"
        : "Polls can't be forwarded";
  }
  if (message.viewOnce) return "View once messages can't be forwarded";
  if (isDeleted(message)) return "Deleted messages can't be forwarded";
  // Not on the server yet, so there is nothing for it to forward.
  if (message.status === "sending" || message.status === "failed") return "Wait until the message is sent";
  return null;
}

export const canForward = (message: Candidate) => forwardBlockReason(message) === null;

/** Announcements and deleted messages have nothing worth quoting. */
export function canQuote(message: Candidate): boolean {
  return message.messageType !== "Announcement" && !isDeleted(message) && !message.viewOnce;
}
