import type { MessageType } from "@/lib/types/type";
import { isVoiceNoteName } from "@/lib/voiceNote";

/**
 * The one rule for what kind of message something is. Mirrored in velo-socket
 * (src/lib/messageType.ts), where it is authoritative: a client's own claim never decides.
 */

/** Types whose content is validated elsewhere; a request for one of these is kept as asked. */
const STRUCTURED: ReadonlySet<string> = new Set([
  "Poll",
  "Call",
  "Location",
  "Contact",
  "Sticker",
  "AnimatedGIF",
  "Announcement",
]);

const URL_ONLY = /^https?:\/\/[^\s"]+$/i;

/** One-line stand-ins for messages that have no text of their own (chat list, quotes, copy). */
export const ATTACHMENT_LABELS: Record<string, string> = {
  Image: "📷 Photo",
  Video: "🎥 Video",
  Audio: "🎵 Audio",
  VoiceNote: "🎤 Voice message",
  File: "📄 File",
};

export const isUrlOnly = (content: string) => URL_ONLY.test(content.trim());

export interface TypeInput {
  content?: string;
  attachments?: { type?: string; name?: string; key?: string }[];
  /** What the sender asked for: Text or Markdown, or a structured type. */
  requested?: string;
}

function attachmentKind(type: string | undefined): "image" | "video" | "audio" | "file" {
  const major = (type ?? "").split("/")[0];
  return major === "image" || major === "video" || major === "audio" ? major : "file";
}

export function deriveMessageType({ content = "", attachments = [], requested }: TypeInput): MessageType {
  if (requested && STRUCTURED.has(requested)) return requested as MessageType;

  const text = content.trim();
  if (attachments.length > 0) {
    if (text) return requested === "Markdown" ? "Markdown" : "Text"; // files with a caption
    const kinds = new Set(attachments.map((a) => attachmentKind(a.type)));
    if (kinds.size > 1) return "File";
    const kind = [...kinds][0];
    if (kind === "audio" && attachments.length === 1 && isVoiceNoteName(attachments[0].name ?? attachments[0].key)) {
      return "VoiceNote";
    }
    return kind === "image" ? "Image" : kind === "video" ? "Video" : kind === "audio" ? "Audio" : "File";
  }

  if (isUrlOnly(text)) return "Link";
  return requested === "Markdown" ? "Markdown" : "Text";
}
