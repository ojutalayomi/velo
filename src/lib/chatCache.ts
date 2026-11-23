import type { AllChats, MessageAttributes } from "@/lib/types/type";

/**
 * Local IndexedDB cache of the chat snapshot (chat list, settings, newest messages).
 *
 * It is a cache, never the source of truth: the server always wins on the next fetch.
 * Every function degrades to a no-op/`null` when IndexedDB is missing, blocked (some private
 * windows), or fails, so callers never need to guard against it.
 */

const DB_NAME = "velo-chat-cache";
const DB_VERSION = 1;
const MESSAGES = "messages";
const META = "meta";
const SNAPSHOT_KEY = "snapshot";

type Snapshot = Omit<AllChats, "messages"> & { savedAt: number };

let dbPromise: Promise<IDBDatabase | null> | null = null;

export function isChatCacheSupported(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase | null> {
  if (!isChatCacheSupported()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(MESSAGES)) {
          const store = db.createObjectStore(MESSAGES, { keyPath: "_id" });
          store.createIndex("chatId", "chatId");
        }
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
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

function txDone(tx: IDBTransaction): Promise<boolean> {
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  });
}

function reqResult<T>(req: IDBRequest<T>): Promise<T | undefined> {
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(undefined);
  });
}

/** Replace the cached snapshot with a fresh server response. */
export async function saveChatSnapshot(data: AllChats): Promise<void> {
  try {
    const db = await openDb();
    if (!db || !data.requestId) return;
    const { messages = [], ...rest } = data;
    const tx = db.transaction([MESSAGES, META], "readwrite");
    const done = txDone(tx);
    // Clear first so messages deleted on the server don't linger in the cache.
    tx.objectStore(MESSAGES).clear();
    for (const m of messages) {
      if (m?._id) tx.objectStore(MESSAGES).put(m);
    }
    tx.objectStore(META).put({ ...rest, savedAt: Date.now() } satisfies Snapshot, SNAPSHOT_KEY);
    await done;
  } catch {
    // Cache writes are best effort (quota, private mode, ...).
  }
}

/** Load the cached snapshot, only if it belongs to `userId`. */
export async function loadChatSnapshot(userId: string): Promise<AllChats | null> {
  try {
    const db = await openDb();
    if (!db || !userId) return null;
    const tx = db.transaction([MESSAGES, META], "readonly");
    const meta = (await reqResult(tx.objectStore(META).get(SNAPSHOT_KEY))) as Snapshot | undefined;
    if (!meta || meta.requestId !== userId) return null;
    const messages = ((await reqResult(tx.objectStore(MESSAGES).getAll())) ??
      []) as MessageAttributes[];
    const rest: Partial<Snapshot> = { ...meta };
    delete rest.savedAt;
    return { ...(rest as Omit<Snapshot, "savedAt">), messages };
  } catch {
    return null;
  }
}

/** Drop everything — call on logout so the next user on this browser never sees it. */
export async function clearChatCache(): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;
    const tx = db.transaction([MESSAGES, META], "readwrite");
    const done = txDone(tx);
    tx.objectStore(MESSAGES).clear();
    tx.objectStore(META).clear();
    await done;
  } catch {
    // ignore
  }
}
