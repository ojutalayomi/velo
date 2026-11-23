import type { AllChats, ConvoType, MessageAttributes, NewChatSettings } from "@/lib/types/type";

/**
 * Local IndexedDB cache of the chat state: conversations (the chat list), per-chat settings and
 * messages, plus a small `meta` record that says which user it belongs to and where the last
 * server sync stopped.
 *
 * It is a cache, never the source of truth: the server always wins on the next fetch. Every
 * function degrades to a no-op/`null` when IndexedDB is missing, blocked (some private windows),
 * or fails, so callers never need to guard against it.
 *
 * Rows are written by the live persister (`redux/chatPersistence.ts`); `saveChatMeta` is written
 * only after those rows, so `serverTime` can never run ahead of the data it describes.
 */

const DB_NAME = "velo-chat-cache";
const DB_VERSION = 2;
const MESSAGES = "messages";
const CONVERSATIONS = "conversations";
const SETTINGS = "settings";
const META = "meta";
const META_KEY = "meta";

export type ChatMeta = {
  requestId: string;
  pagination?: AllChats["pagination"];
  /** Server clock of the last sync; the cursor for the next `since` request. */
  serverTime?: string;
};

export type ChatSnapshot = ChatMeta & {
  conversations: ConvoType[];
  chatSettings: Record<string, NewChatSettings>;
  messages: MessageAttributes[];
};

export type ChatChanges = {
  /** Wipe every row store first (the first write of a session, and user switches). */
  replaceAll?: boolean;
  conversations?: { put: ConvoType[]; remove: string[] };
  settings?: { put: Record<string, NewChatSettings>; remove: string[] };
  messages?: { put: MessageAttributes[]; remove: string[] };
};

type SettingsRow = { chatId: string; value: NewChatSettings };

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
      req.onupgradeneeded = (event) => {
        const db = req.result;
        if (!db.objectStoreNames.contains(MESSAGES)) {
          const store = db.createObjectStore(MESSAGES, { keyPath: "_id" });
          store.createIndex("chatId", "chatId");
        }
        if (!db.objectStoreNames.contains(CONVERSATIONS)) {
          db.createObjectStore(CONVERSATIONS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(SETTINGS)) {
          db.createObjectStore(SETTINGS, { keyPath: "chatId" });
        }
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
        // v1 kept chats and settings inside one meta record. This is a disposable cache, so
        // drop it: the next load is a normal full fetch and no migration code is needed.
        if (event.oldVersion > 0 && event.oldVersion < 2) {
          req.transaction?.objectStore(META).clear();
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

/** Apply a batch of row changes in one transaction. Resolves true when it was stored. */
export async function persistChatChanges(changes: ChatChanges): Promise<boolean> {
  try {
    const db = await openDb();
    if (!db) return false;
    const tx = db.transaction([MESSAGES, CONVERSATIONS, SETTINGS], "readwrite");
    const done = txDone(tx);
    const messages = tx.objectStore(MESSAGES);
    const conversations = tx.objectStore(CONVERSATIONS);
    const settings = tx.objectStore(SETTINGS);

    if (changes.replaceAll) {
      messages.clear();
      conversations.clear();
      settings.clear();
    }
    for (const id of changes.messages?.remove ?? []) messages.delete(id);
    for (const m of changes.messages?.put ?? []) if (m?._id) messages.put(m);
    for (const id of changes.conversations?.remove ?? []) conversations.delete(id);
    for (const c of changes.conversations?.put ?? []) if (c?.id) conversations.put(c);
    for (const chatId of changes.settings?.remove ?? []) settings.delete(chatId);
    for (const [chatId, value] of Object.entries(changes.settings?.put ?? {})) {
      settings.put({ chatId, value } satisfies SettingsRow);
    }
    return await done;
  } catch {
    // Cache writes are best effort (quota, private mode, ...).
    return false;
  }
}

/** Record whose user the cache belongs to and where the last sync stopped. Call after the rows. */
export async function saveChatMeta(meta: ChatMeta): Promise<void> {
  try {
    const db = await openDb();
    if (!db || !meta.requestId) return;
    const tx = db.transaction(META, "readwrite");
    const done = txDone(tx);
    tx.objectStore(META).put({ ...meta, savedAt: Date.now() }, META_KEY);
    await done;
  } catch {
    // best effort
  }
}

/** Load the cached state, only if it belongs to `userId`. */
export async function loadChatSnapshot(userId: string): Promise<ChatSnapshot | null> {
  try {
    const db = await openDb();
    if (!db || !userId) return null;
    const tx = db.transaction([MESSAGES, CONVERSATIONS, SETTINGS, META], "readonly");
    const meta = (await reqResult(tx.objectStore(META).get(META_KEY))) as
      | (ChatMeta & { savedAt?: number })
      | undefined;
    if (!meta || meta.requestId !== userId) return null;
    const messages = ((await reqResult(tx.objectStore(MESSAGES).getAll())) ??
      []) as MessageAttributes[];
    const conversations = ((await reqResult(tx.objectStore(CONVERSATIONS).getAll())) ??
      []) as ConvoType[];
    const settingRows = ((await reqResult(tx.objectStore(SETTINGS).getAll())) ??
      []) as SettingsRow[];
    const chatSettings: Record<string, NewChatSettings> = {};
    for (const row of settingRows) chatSettings[row.chatId] = row.value;
    return {
      requestId: meta.requestId,
      pagination: meta.pagination,
      serverTime: meta.serverTime,
      conversations,
      chatSettings,
      messages,
    };
  } catch {
    return null;
  }
}

/** Drop everything — call on logout so the next user on this browser never sees it. */
export async function clearChatCache(): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;
    const tx = db.transaction([MESSAGES, CONVERSATIONS, SETTINGS, META], "readwrite");
    const done = txDone(tx);
    tx.objectStore(MESSAGES).clear();
    tx.objectStore(CONVERSATIONS).clear();
    tx.objectStore(SETTINGS).clear();
    tx.objectStore(META).clear();
    await done;
  } catch {
    // ignore
  }
}
