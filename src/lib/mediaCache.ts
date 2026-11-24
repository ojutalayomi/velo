/**
 * Offline copies of chat files (voice notes, images, videos, documents) in the Cache API.
 *
 * Files are fetched explicitly with CORS and stored whole. They are deliberately NOT cached by
 * intercepting requests in a service worker: <audio>/<video> ask for byte ranges (206), which the
 * Cache API refuses to store, and <img> loads are opaque (no-cors), which can't be read back and
 * are counted as ~7 MB each against the storage quota in Chrome. The S3 bucket allows CORS GET
 * from the app's origin, so a direct fetch works there (not from `localhost`).
 *
 * Playback from the cache goes through a blob: URL, which also sidesteps Range handling.
 * Everything degrades to "just use the network URL": a missing Cache API, a failed fetch, a file
 * over the size cap, or a full quota all resolve to `null` rather than throwing.
 *
 * The Cache API can't say when an entry was last used, so a small IndexedDB index tracks
 * `{ url, size, lastUsed }` for least-recently-used eviction.
 */

export const MEDIA_CACHE = "velo-chat-media-v1";
const INDEX_DB = "velo-media-index";
const INDEX_STORE = "media";

export type MediaKind = "audio" | "image" | "video" | "file";

const MB = 1024 * 1024;
/**
 * Size limits in bytes. `perFile`: bigger files keep streaming from the network instead.
 * `total`: everything cached together; the least recently used files go first when exceeded.
 */
export const MEDIA_LIMITS: { perFile: Record<MediaKind, number>; total: number } = {
  perFile: { audio: 25 * MB, image: 25 * MB, file: 25 * MB, video: 50 * MB },
  total: 200 * MB,
};

type IndexRow = { url: string; size: number; lastUsed: number };

/** Only real file URLs: a blob:/data: URL is a local draft (e.g. an unsent recording). */
export function isCacheableUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function isMediaCacheSupported(): boolean {
  try {
    return typeof caches !== "undefined" && caches !== null;
  } catch {
    return false;
  }
}

/* ---------- LRU index (IndexedDB) ---------- */

let indexPromise: Promise<IDBDatabase | null> | null = null;

function openIndex(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined" || indexedDB === null) return Promise.resolve(null);
  if (indexPromise) return indexPromise;
  indexPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(INDEX_DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(INDEX_STORE)) {
          req.result.createObjectStore(INDEX_STORE, { keyPath: "url" });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          indexPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return indexPromise;
}

function txDone(tx: IDBTransaction): Promise<boolean> {
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  });
}

async function readIndex(): Promise<IndexRow[]> {
  try {
    const db = await openIndex();
    if (!db) return [];
    const req = db.transaction(INDEX_STORE, "readonly").objectStore(INDEX_STORE).getAll();
    return await new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result as IndexRow[]);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function writeIndex(put: IndexRow[], remove: string[] = []): Promise<void> {
  try {
    const db = await openIndex();
    if (!db) return;
    const tx = db.transaction(INDEX_STORE, "readwrite");
    const done = txDone(tx);
    const store = tx.objectStore(INDEX_STORE);
    for (const url of remove) store.delete(url);
    for (const row of put) store.put(row);
    await done;
  } catch {
    // best effort
  }
}

async function clearIndex(): Promise<void> {
  try {
    const db = await openIndex();
    if (!db) return;
    const tx = db.transaction(INDEX_STORE, "readwrite");
    const done = txDone(tx);
    tx.objectStore(INDEX_STORE).clear();
    await done;
  } catch {
    // best effort
  }
}

/* ---------- public API ---------- */

/** A blob: URL for a file saved earlier, or null. The caller should revoke it when done. */
export async function getCachedMediaUrl(url: string): Promise<string | null> {
  try {
    if (!isMediaCacheSupported() || !isCacheableUrl(url)) return null;
    const cache = await caches.open(MEDIA_CACHE);
    const hit = await cache.match(url);
    if (!hit) return null;
    const blob = await hit.blob();
    void touch(url, blob.size);
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/** Mark a file as used just now, so eviction keeps what people actually open. */
async function touch(url: string, size: number): Promise<void> {
  await writeIndex([{ url, size, lastUsed: Date.now() }]);
}

/** Make room for `incoming` bytes by deleting the least recently used files. */
async function evictFor(incoming: number): Promise<void> {
  const rows = await readIndex();
  let total = rows.reduce((sum, row) => sum + row.size, 0) + incoming;
  if (total <= MEDIA_LIMITS.total) return;
  const cache = await caches.open(MEDIA_CACHE);
  const evicted: string[] = [];
  for (const row of rows.sort((a, b) => a.lastUsed - b.lastUsed)) {
    if (total <= MEDIA_LIMITS.total) break;
    await cache.delete(row.url);
    evicted.push(row.url);
    total -= row.size;
  }
  await writeIndex([], evicted);
}

const inFlight = new Map<string, Promise<string | null>>();

/**
 * Download a file and keep it for offline use. Resolves to a blob: URL of the copy, or null when
 * it wasn't saved: unsupported, request failed, not a complete 200 response, or over the size cap.
 * Concurrent calls for one URL share a single download.
 */
export function cacheMedia(url: string, kind: MediaKind): Promise<string | null> {
  if (!isMediaCacheSupported() || !isCacheableUrl(url)) return Promise.resolve(null);
  const running = inFlight.get(url);
  if (running) return running;
  const job = download(url, kind).finally(() => inFlight.delete(url));
  inFlight.set(url, job);
  return job;
}

async function download(url: string, kind: MediaKind): Promise<string | null> {
  try {
    const cap = MEDIA_LIMITS.perFile[kind];
    // `reload` skips the browser's HTTP cache: the same file was usually loaded just before by an
    // <img>/<audio> tag without CORS, and Chrome would reuse that copy (it has no CORS headers),
    // so the fetch would fail with "No Access-Control-Allow-Origin header".
    const response = await fetch(url, { mode: "cors", credentials: "omit", cache: "reload" });
    // The Cache API can't store partial (206) or failed responses.
    if (response.status !== 200) return null;
    const declared = Number(response.headers.get("content-length"));
    if (declared > cap) {
      void response.body?.cancel();
      return null;
    }
    const blob = await response.blob();
    if (blob.size > cap) return null;

    await evictFor(blob.size);
    const cache = await caches.open(MEDIA_CACHE);
    await cache.put(
      url,
      new Response(blob, {
        status: 200,
        headers: { "content-type": blob.type || response.headers.get("content-type") || "" },
      })
    );
    await touch(url, blob.size);
    void requestPersistence();
    return URL.createObjectURL(blob);
  } catch {
    // Offline, CORS refusal, quota exceeded, ...: the caller keeps using the network URL.
    return null;
  }
}

let persistenceAsked = false;
/** Ask the browser not to evict our storage under pressure. Once, best effort. */
async function requestPersistence(): Promise<void> {
  if (persistenceAsked) return;
  persistenceAsked = true;
  try {
    await navigator.storage?.persist?.();
  } catch {
    // ignore
  }
}

/** Delete every saved file. Called on logout so the next person can't open them. */
export async function clearMediaCache(): Promise<void> {
  try {
    if (isMediaCacheSupported()) await caches.delete(MEDIA_CACHE);
  } catch {
    // ignore
  }
  await clearIndex();
}
