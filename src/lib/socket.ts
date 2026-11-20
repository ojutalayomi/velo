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

export type ServerEvent =
  | "follow"
  | "unfollow"
  | "status:create"
  | "status:delete"
  | "status:view"
  | "addChat"
  | "chatMessage"
  | "chat:updated"
  | "chat:participantsAdded"
  | "chat:participantsRemoved";

export type EmitOptions = {
  connectTimeoutMs?: number;
  ackTimeoutMs?: number;
  /** Hard ceiling for the whole call, so a slow socket server cannot outlast the API route. */
  totalTimeoutMs?: number;
};

/**
 * For Next.js API routes (especially Vercel): open one dedicated connection, wait until
 * connected, emit each event in order waiting for its acknowledgement, then close. Fire-and-forget
 * `emit` on a cold client often never reaches the socket server because the serverless function
 * exits before the handshake completes.
 */
export async function emitSequenceViaSocketServer(
  userId: string,
  events: { event: ServerEvent; payload: Record<string, unknown> }[],
  options?: EmitOptions
): Promise<void> {
  const baseUrl = getSocketServerUrl();
  if (!baseUrl) {
    throw new Error("Missing SOCKET_SERVER_URL or NEXT_PUBLIC_SOCKET_URL");
  }
  const connectTimeoutMs = options?.connectTimeoutMs ?? 12_000;
  const ackTimeoutMs = options?.ackTimeoutMs ?? 10_000;
  const totalTimeoutMs = options?.totalTimeoutMs;

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

  let deadline: ReturnType<typeof setTimeout> | undefined;

  const run = async () => {
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

    for (const { event, payload } of events) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Socket server ack for ${event} timed out after ${ackTimeoutMs}ms`));
        }, ackTimeoutMs);
        client.emit(event, payload, () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  };

  try {
    if (totalTimeoutMs === undefined) {
      await run();
    } else {
      await Promise.race([
        run(),
        new Promise<never>((_, reject) => {
          deadline = setTimeout(
            () => reject(new Error(`Socket emit exceeded ${totalTimeoutMs}ms`)),
            totalTimeoutMs
          );
        }),
      ]);
    }
  } finally {
    if (deadline) clearTimeout(deadline);
    close();
  }
}

export async function emitViaSocketServer(
  userId: string,
  event: ServerEvent,
  payload: Record<string, unknown>,
  options?: EmitOptions
): Promise<void> {
  await emitSequenceViaSocketServer(userId, [{ event, payload }], options);
}
