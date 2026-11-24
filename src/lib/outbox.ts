/**
 * Messages written while offline (or while the connection drops) wait here until the server has
 * them, then they are sent again automatically.
 *
 * A message is saved here BEFORE it is emitted, and removed only when the server's own copy
 * comes back (the sender receives their message through the same `newMessage` event as everyone
 * else). So a closed tab, a reload or a dropped connection never loses it. The socket server
 * ignores a message whose `_id` it already has, which is what makes resending safe.
 *
 * This is its own IndexedDB database, separate from the chat cache: that cache is rewritten
 * from the server and must never be allowed to wipe messages that haven't reached it yet.
 * Everything resolves to a harmless no-op when IndexedDB is unavailable.
 *
 * Text only for now: files are sent as raw bytes over the socket and need a connection.
 */

const DB_NAME = "velo-outbox";
const STORE = "queue";

/** A message is retried this many times, then marked as failed. */
export const MAX_ATTEMPTS = 5;
/** Don't resend a message that was sent less than this long ago (it may still be arriving). */
export const RETRY_GAP_MS = 10_000;

export type QueuedMessage = {
  _id: string;
  userId: string;
  message: Record<string, unknown>;
  queuedAt: number;
  attempts: number;
  lastTriedAt: number;
};

type Sendable = object;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  try {
    if (typeof indexedDB === "undefined" || indexedDB === null) return Promise.resolve(null);
  } catch {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: "_id" });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<boolean> {
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  });
}

/** Whether a message can wait in the outbox: files are sent as raw bytes and need a connection. */
export function canQueue(message: Sendable): boolean {
  const { _id, attachments } = (message ?? {}) as { _id?: unknown; attachments?: unknown };
  return !!_id && (!Array.isArray(attachments) || attachments.length === 0);
}

/** Save a message to be sent. Resolves true when it was stored. */
export async function queueMessage(userId: string, message: Sendable): Promise<boolean> {
  try {
    if (!userId || !canQueue(message)) return false;
    const db = await openDb();
    if (!db) return false;
    const tx = db.transaction(STORE, "readwrite");
    const finished = done(tx);
    const row: QueuedMessage = {
      _id: String((message as { _id: unknown })._id),
      userId,
      // A plain copy: the message may be a class instance, and nothing here may hold a reference.
      message: JSON.parse(JSON.stringify(message)),
      queuedAt: Date.now(),
      attempts: 0,
      lastTriedAt: Date.now(),
    };
    tx.objectStore(STORE).put(row);
    return await finished;
  } catch {
    return false;
  }
}

/** This user's waiting messages, oldest first. */
export async function listQueued(userId: string): Promise<QueuedMessage[]> {
  try {
    const db = await openDb();
    if (!db || !userId) return [];
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    const rows = await new Promise<QueuedMessage[]>((resolve) => {
      req.onsuccess = () => resolve(req.result as QueuedMessage[]);
      req.onerror = () => resolve([]);
    });
    return rows.filter((row) => row.userId === userId).sort((a, b) => a.queuedAt - b.queuedAt);
  } catch {
    return [];
  }
}

/** The server has the message (or it was given up on): stop sending it. */
export async function removeQueued(id: string): Promise<void> {
  try {
    const db = await openDb();
    if (!db || !id) return;
    const tx = db.transaction(STORE, "readwrite");
    const finished = done(tx);
    tx.objectStore(STORE).delete(id);
    await finished;
  } catch {
    // best effort
  }
}

async function writeRow(row: QueuedMessage): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;
    const tx = db.transaction(STORE, "readwrite");
    const finished = done(tx);
    tx.objectStore(STORE).put(row);
    await finished;
  } catch {
    // best effort
  }
}

/** Forget every waiting message (logout: they must not be sent by whoever signs in next). */
export async function clearOutbox(): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;
    const tx = db.transaction(STORE, "readwrite");
    const finished = done(tx);
    tx.objectStore(STORE).clear();
    await finished;
  } catch {
    // best effort
  }
}

export type FlushResult = { sent: string[]; failed: string[] };

/**
 * Send what is waiting. A message stays queued until the server's copy arrives, so each pass
 * only counts an attempt; after MAX_ATTEMPTS it is dropped and reported in `failed`.
 */
export async function flushOutbox(options: {
  userId: string;
  emit: (message: Record<string, unknown>) => void;
  now?: number;
}): Promise<FlushResult> {
  const now = options.now ?? Date.now();
  const result: FlushResult = { sent: [], failed: [] };
  for (const row of await listQueued(options.userId)) {
    if (row.attempts >= MAX_ATTEMPTS) {
      await removeQueued(row._id);
      result.failed.push(row._id);
      continue;
    }
    if (now - row.lastTriedAt < RETRY_GAP_MS) continue;
    try {
      options.emit(row.message);
    } catch {
      continue; // couldn't even hand it to the socket: leave it for the next pass
    }
    await writeRow({ ...row, attempts: row.attempts + 1, lastTriedAt: now });
    result.sent.push(row._id);
  }
  return result;
}
