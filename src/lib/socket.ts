import { io, Socket } from "socket.io-client";

const SOCKET_PATH = "/wxyrt";

/** Browser: `NEXT_PUBLIC_SOCKET_URL`. Server (API routes): prefer `SOCKET_SERVER_URL` so Vercel can point at your socket host without relying on public env only. */
export function getSocketServerUrl(): string {
  const raw =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_SOCKET_URL
      : process.env.SOCKET_SERVER_URL || process.env.NEXT_PUBLIC_SOCKET_URL;
  return String(raw ?? "").replace(/\/$/, "");
}

// Initialize socket connection once (legacy; prefer `emitViaSocketServer` from API routes on serverless)
let socket: Socket | undefined;

export function getSocketInstance(userId: string) {
  const baseUrl = getSocketServerUrl();
  if (!socket) {
    socket = io(baseUrl, {
      path: SOCKET_PATH,
      transports: ["websocket", "polling"],
      query: { userId },
    });
  } else if (socket.io.opts?.query?.userId !== userId) {
    socket.io.opts.query = { userId };
    socket.disconnect().connect(); // Reconnect with new userId
  }
  return socket;
}

/**
 * For Next.js API routes (especially Vercel): open a dedicated connection, wait until connected,
 * emit with acknowledgement, then close. Fire-and-forget `emit` on a cold client often never
 * reaches the socket server because the serverless function exits before the handshake completes.
 */
export async function emitViaSocketServer(
  userId: string,
  event: "follow" | "unfollow" | "status:create" | "status:delete" | "status:view",
  payload: Record<string, unknown>,
  options?: { connectTimeoutMs?: number; ackTimeoutMs?: number }
): Promise<void> {
  const baseUrl = getSocketServerUrl();
  if (!baseUrl) {
    throw new Error("Missing SOCKET_SERVER_URL or NEXT_PUBLIC_SOCKET_URL");
  }
  const connectTimeoutMs = options?.connectTimeoutMs ?? 12_000;
  const ackTimeoutMs = options?.ackTimeoutMs ?? 10_000;

  const client = io(baseUrl, {
    path: SOCKET_PATH,
    transports: ["websocket", "polling"],
    query: { userId },
    forceNew: true,
    autoConnect: true,
    withCredentials: true,
  });

  const close = () => {
    try {
      client.removeAllListeners();
      if (client.connected) client.disconnect();
      client.close();
    } catch {
      /* ignore */
    }
  };

  try {
    await new Promise<void>((resolve, reject) => {
      if (client.connected) {
        resolve();
        return;
      }
      const timer = setTimeout(() => {
        reject(new Error(`Socket connect timed out after ${connectTimeoutMs}ms`));
      }, connectTimeoutMs);
      const done = () => clearTimeout(timer);
      client.once("connect", () => {
        done();
        resolve();
      });
      client.once("connect_error", (err: Error) => {
        done();
        reject(err);
      });
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Socket server ack timed out after ${ackTimeoutMs}ms`));
      }, ackTimeoutMs);
      client.emit(event, payload, () => {
        clearTimeout(timer);
        resolve();
      });
    });
  } finally {
    close();
  }
}
