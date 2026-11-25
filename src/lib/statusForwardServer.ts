import { DEFAULT_STATUS_BACKGROUND } from "@/lib/statusBackgrounds";
import { statusTextFrom } from "@/lib/statusForward";
import { MAX_STATUS_AUDIO_SECONDS } from "@/lib/statusServer";
import { voiceNoteSeconds } from "@/lib/voiceNote";

type StoredFile = { name: string; type?: string };

/** The create payload (before the media copy gets its new URL) for a chat message. */
export function statusPayloadFor(
  message: { messageType: string; content: string },
  file: StoredFile | null
): { mediaType: "text" | "image" | "video" | "audio"; text?: string; background?: string; durationSec?: number; caption?: string } | null {
  if (message.messageType === "Text") {
    const text = statusTextFrom(message.content);
    return text ? { mediaType: "text", text, background: DEFAULT_STATUS_BACKGROUND } : null;
  }
  if (!file) return null;
  if (message.messageType === "Image") return { mediaType: "image" };
  if (message.messageType === "Video") return { mediaType: "video" };
  if (message.messageType === "VoiceNote") {
    const seconds = voiceNoteSeconds(file.name) ?? 0;
    return { mediaType: "audio", durationSec: Math.min(Math.max(seconds, 1), MAX_STATUS_AUDIO_SECONDS) };
  }
  return null;
}
