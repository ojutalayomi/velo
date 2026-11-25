/** What a view once bubble should show, from the point of view of whoever is looking at it. */
export type ViewOnceState = "ready" | "opened" | "expired" | "sent" | "seen";

type Source = {
  viewOnce?: boolean;
  viewOnceOpenedBy?: string[];
  viewOnceGone?: boolean;
};

/**
 * Sender: "sent" until somebody opens it, then "seen". Recipient: "ready" until they open it, then
 * "opened"; "expired" when the file is gone and they never opened it (24 hours, or deleted).
 */
export function viewOnceState(message: Source, userId: string, senderId: string): ViewOnceState {
  const openedBy = message.viewOnceOpenedBy ?? [];
  if (senderId === userId) return openedBy.length > 0 ? "seen" : "sent";
  if (openedBy.includes(userId)) return "opened";
  return message.viewOnceGone ? "expired" : "ready";
}

/** Name of the kind of file, for labels. */
export function viewOnceKind(messageType?: string) {
  return messageType === "Video" ? "video" : messageType === "VoiceNote" ? "voice message" : "photo";
}

/** The line that stands in for the file in the chat list and in quotes. */
export function viewOnceLabel(messageType?: string) {
  const emoji = messageType === "Video" ? "🎥" : messageType === "VoiceNote" ? "🎤" : "📷";
  return `${emoji} View once ${viewOnceKind(messageType)}`;
}

export type OpenViewOnceResult =
  | { ok: true; url: string; expiresInSeconds: number }
  | { ok: false; error: string };

type SocketLike = {
  timeout: (ms: number) => {
    emit: (event: string, payload: unknown, cb: (err: Error | null, res?: OpenViewOnceResult) => void) => void;
  };
};

/** Asks the server to open a view once message. It answers once per person; the answer holds the only link. */
export function requestViewOnce(socket: SocketLike | null | undefined, messageId: string): Promise<OpenViewOnceResult> {
  if (!socket) return Promise.resolve({ ok: false, error: "You're offline" });
  return new Promise((resolve) => {
    socket.timeout(15_000).emit("openViewOnce", { messageId }, (err, res) => {
      if (err || !res) resolve({ ok: false, error: "Couldn't open this. Try again." });
      else resolve(res);
    });
  });
}
