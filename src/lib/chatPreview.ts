import { DELETED_MARKER, deletedPreview } from "@/lib/messageDeletion";
import { messageText } from "@/lib/polls";
import { isUrlOnly } from "@/lib/messageType";
import { isVoiceNoteName } from "@/lib/voiceNote";
import type { ConvoType } from "@/lib/types/type";

/** One line of plain text from markdown: no fences, markers, link syntax or line breaks. */
export function plainPreview(text: string): string {
  return text
    .replace(/```[^\n`]*\n?/g, " ") // fence lines, with their language tag
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/(\*\*|__|~~|\*|`)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A link on its own is shown as its site, not as a long address. */
function linkPreview(url: string): string {
  try {
    return `🔗 ${new URL(url.trim()).hostname.replace(/^www\./, "")}`;
  } catch {
    return `🔗 ${url.trim()}`;
  }
}

interface PreviewSource {
  messageType?: string;
  content?: string;
  attachments?: unknown[];
  viewOnce?: boolean;
}

/** What the chat list shows for a message (without the sender's name). */
export function previewFor(message: PreviewSource): string {
  const content = message.content ?? "";
  if (content.endsWith(DELETED_MARKER)) return deletedPreview(content);

  if (message.viewOnce) return messageText(message);
  const hasContent = content.trim() !== "";
  const attachments = message.attachments ?? [];

  if (message.messageType === "Link" || (hasContent && attachments.length === 0 && isUrlOnly(content))) {
    return linkPreview(content);
  }

  let text = messageText(message);
  if (text && (message.messageType === "Markdown" || text.includes("```"))) {
    text = plainPreview(text);
  }
  if (text) return `${hasContent && attachments.length > 0 ? "📷 " : ""}${text}`;

  // Older messages have no specific type; a voice note is recognisable by its stored name.
  const named = attachments.some((a) =>
    isVoiceNoteName(typeof a === "string" ? a : (a as { key?: string; name?: string })?.key)
  );
  if (named) return "🎤 Voice message";
  return attachments.length > 0 ? "📎 Attachment" : "";
}

/** The conversation fields to update when `message` becomes the chat's latest. */
export function convoPreviewUpdate(message: {
  _id?: unknown;
  messageType?: string;
  content?: string;
  attachments?: unknown[];
  viewOnce?: boolean;
  sender?: { id?: string; name?: string };
}): Partial<ConvoType> {
  return {
    lastMessage: previewFor(message),
    lastMessageId: String(message._id ?? ""),
    lastSenderId: message.sender?.id,
    lastSenderName: message.sender?.name,
    lastRead: false,
  };
}

/** True for previews that describe the message rather than quote it (no "Name:" in front). */
export const isSystemPreview = (text: string) => /^(🚫|📝|You deleted|This message was deleted)/.test(text);
