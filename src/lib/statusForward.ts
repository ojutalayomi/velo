import { MAX_STATUS_TEXT } from "@/lib/statusBackgrounds";

/** The deleted-message marker that clients and the server append to content. */
const DELETED_MARKER = "≤≤≤";

/** Chat message types that can become a status. Everything else only makes sense inside its chat. */
export const STATUS_FORWARD_TYPES = ["Text", "Image", "Video", "VoiceNote"] as const;

type Candidate = {
  messageType?: string;
  content?: string;
  attachmentCount: number;
  viewOnce?: boolean;
};

/** Why a message can't be shared to status, or null when it can. */
export function statusForwardBlockReason(message: Candidate): string | null {
  if ((message.content ?? "").endsWith(DELETED_MARKER)) return "Deleted messages can't be shared";
  if (message.viewOnce) return "View once messages can't be shared";
  if (!STATUS_FORWARD_TYPES.includes(message.messageType as (typeof STATUS_FORWARD_TYPES)[number])) {
    return "Only text, photos, videos and voice notes can be added to your status";
  }
  if (message.messageType === "Text") {
    return (message.content ?? "").trim() ? null : "There's nothing to share";
  }
  return message.attachmentCount === 1 ? null : "There's nothing to share";
}

/** The text of a forwarded text message, trimmed to what a text status can hold. */
export function statusTextFrom(content: string) {
  return content.trim().slice(0, MAX_STATUS_TEXT);
}
