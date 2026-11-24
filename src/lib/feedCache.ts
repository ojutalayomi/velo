import type { PaginationMeta } from "@/lib/apiPagination";

/**
 * The first page of each home feed (For You, Following, status avatars) in IndexedDB, so the home
 * page paints at once on every load and still shows something offline. Like the chat cache it is
 * disposable: the server always wins on the next fetch, rows belong to one user, and every
 * function degrades to a no-op/`null` when IndexedDB is missing or fails.
 */

const DB_NAME = "velo-feed-cache";
const DB_VERSION = 1;
const STORE = "feeds";

export type FeedKey =
  | "forYou"
  | "following"
  | "status"
  | "suggestions"
  | "notifications:all"
  | "notifications:mentions"
  | "notifications:verified";

export type CachedFeed<T> = {
  key: FeedKey;
  userId: string;
  data: T[];
  pagination: PaginationMeta;
  savedAt: number;
};

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
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: "key" });
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

/** Keep a feed's first page for this user. Resolves true when it was stored. */
export async function saveFeed<T>(
  key: FeedKey,
  userId: string,
  data: T[],
  pagination: PaginationMeta
): Promise<boolean> {
  try {
    if (!userId) return false;
    const db = await openDb();
    if (!db) return false;
    const tx = db.transaction(STORE, "readwrite");
    const finished = done(tx);
    tx.objectStore(STORE).put({ key, userId, data, pagination, savedAt: Date.now() } satisfies CachedFeed<T>);
    return await finished;
  } catch {
    return false;
  }
}

/** The saved feed, only if it belongs to `userId`. */
export async function loadFeed<T>(key: FeedKey, userId: string): Promise<CachedFeed<T> | null> {
  try {
    if (!userId) return null;
    const db = await openDb();
    if (!db) return null;
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    const row = await new Promise<CachedFeed<T> | undefined>((resolve) => {
      req.onsuccess = () => resolve(req.result as CachedFeed<T> | undefined);
      req.onerror = () => resolve(undefined);
    });
    return row && row.userId === userId && Array.isArray(row.data) ? row : null;
  } catch {
    return null;
  }
}

/** Forget every saved feed (logout), so the next person on this browser never sees them. */
export async function clearFeedCache(): Promise<void> {
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
