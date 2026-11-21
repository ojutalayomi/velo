/** Voice notes are ordinary audio attachments; these helpers name and recognise them. */

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

/** First recording format the browser supports (Chrome/Firefox: webm/ogg, Safari: mp4). */
export function pickVoiceMime(isSupported: (type: string) => boolean): string | undefined {
  return MIME_CANDIDATES.find((type) => isSupported(type));
}

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
};

/** `voice-note-<time>-<seconds>s.<ext>`: the length is kept in the name because recorded files often lack one. */
export function voiceFileName(mimeType: string, seconds: number, now = Date.now()): string {
  const base = mimeType.split(";")[0].trim();
  return `voice-note-${now}-${Math.max(1, Math.round(seconds))}s.${EXTENSIONS[base] ?? "webm"}`;
}

export function isVoiceNoteName(name: string | undefined): boolean {
  return /(^|\/)voice-note-\d+-\d+s\./.test(name ?? "");
}

/** Length in seconds recorded in the file name, if present. */
export function voiceNoteSeconds(name: string | undefined): number | null {
  const match = /voice-note-\d+-(\d+)s\./.exec(name ?? "");
  return match ? Number(match[1]) : null;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
