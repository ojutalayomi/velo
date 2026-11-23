import { type ChatChanges, persistChatChanges } from "@/lib/chatCache";
import type { ConvoType, MessageAttributes, NewChatSettings } from "@/lib/types/type";

/**
 * Keeps the IndexedDB chat cache (`lib/chatCache.ts`) in step with the redux chat state, so a
 * local change (a new message, a pin, an unread count) is saved without waiting for the next
 * server fetch. This is the only writer of conversation, setting and message rows.
 *
 * Changes are found by comparing against what was last written, and flushed after a short
 * debounce. The first flush of a session replaces every row, so rows left over from an earlier
 * session (or removed while syncing) can't linger.
 */

export type ChatStateLike = {
  conversations: ConvoType[];
  settings: Record<string, NewChatSettings>;
  messages: MessageAttributes[];
  userId: string;
  loading: boolean;
};

type Baseline = {
  conversations: Map<string, ConvoType>;
  settings: Map<string, NewChatSettings>;
  /** Source objects as they were in redux, compared by reference (Immer keeps untouched ones). */
  messages: Map<string, MessageAttributes>;
};

const DEBOUNCE_MS = 500;

/** Typing and presence are live signals; saving them would store stale "typing…" and "online". */
const NOBODY_TYPING: ConvoType["isTypingList"] = []; // one shared array, so equal rows compare equal
export function persistableConversation(convo: ConvoType): ConvoType {
  return { ...convo, isTypingList: NOBODY_TYPING, online: false };
}

/** A message still being sent (or that failed) isn't the server's record yet. */
export function shouldPersistMessage(message: MessageAttributes): boolean {
  return !!message?._id && message.status !== "sending" && message.status !== "failed";
}

/** Strip the raw file bytes a freshly picked attachment carries; the stored URL is what's needed. */
export function persistableMessage(message: MessageAttributes): MessageAttributes {
  if (!message.attachments?.some((a) => a && typeof a === "object" && "data" in a && a.data)) {
    return message;
  }
  return {
    ...message,
    attachments: message.attachments.map((a) => {
      if (!a || typeof a !== "object" || !("data" in a)) return a;
      const rest: Record<string, unknown> = { ...a };
      delete rest.data;
      return rest as typeof a;
    }),
  };
}

function shallowEqual(a: object, b: object): boolean {
  const ak = Object.keys(a) as Array<keyof typeof a>;
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every((key) => Object.is(a[key], (b as typeof a)[key]));
}

/**
 * What to write so the cache matches `state`, given what was written before.
 * A `null` baseline means "first write of the session": replace everything.
 */
export function computeChanges(
  state: Pick<ChatStateLike, "conversations" | "settings" | "messages">,
  baseline: Baseline | null
): { changes: ChatChanges; next: Baseline } {
  const next: Baseline = {
    conversations: new Map(),
    settings: new Map(),
    messages: new Map(),
  };

  const convoPut: ConvoType[] = [];
  for (const convo of state.conversations) {
    const persistable = persistableConversation(convo);
    next.conversations.set(convo.id, persistable);
    const before = baseline?.conversations.get(convo.id);
    if (!before || !shallowEqual(persistable, before)) convoPut.push(persistable);
  }

  const settingsPut: Record<string, NewChatSettings> = {};
  for (const [chatId, value] of Object.entries(state.settings ?? {})) {
    if (!chatId) continue; // the empty-id placeholder redux starts with
    next.settings.set(chatId, value);
    if (baseline?.settings.get(chatId) !== value) settingsPut[chatId] = value;
  }

  const messagePut: MessageAttributes[] = [];
  for (const message of state.messages) {
    if (!shouldPersistMessage(message)) continue;
    const id = String(message._id);
    next.messages.set(id, message);
    if (baseline?.messages.get(id) !== message) messagePut.push(persistableMessage(message));
  }

  const removed = <T>(before: Map<string, T> | undefined, now: Map<string, unknown>) =>
    before ? [...before.keys()].filter((id) => !now.has(id)) : [];

  const changes: ChatChanges = {
    replaceAll: baseline === null,
    conversations: { put: convoPut, remove: removed(baseline?.conversations, next.conversations) },
    settings: { put: settingsPut, remove: removed(baseline?.settings, next.settings) },
    messages: { put: messagePut, remove: removed(baseline?.messages, next.messages) },
  };
  return { changes, next };
}

export function hasChanges(changes: ChatChanges): boolean {
  return (
    !!changes.replaceAll ||
    !!changes.conversations?.put.length ||
    !!changes.conversations?.remove.length ||
    Object.keys(changes.settings?.put ?? {}).length > 0 ||
    !!changes.settings?.remove.length ||
    !!changes.messages?.put.length ||
    !!changes.messages?.remove.length
  );
}

type StoreLike = {
  subscribe: (listener: () => void) => () => void;
  getState: () => { chat: ChatStateLike };
};

let baseline: Baseline | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let activeStore: StoreLike | null = null;
let queue: Promise<void> = Promise.resolve();
/** Set by logout: redux still holds the old user's chats, which must not be written back. */
let blocked = false;

function writeNow(): Promise<void> {
  queue = queue.then(async () => {
    const chat = activeStore?.getState().chat;
    // Never persist before the first load has put real data in redux.
    if (blocked || !chat || !chat.userId || chat.loading) return;
    const { changes, next } = computeChanges(chat, baseline);
    if (!hasChanges(changes)) return;
    if (await persistChatChanges(changes)) baseline = next;
  });
  return queue;
}

/**
 * Save pending changes now. `fetchChats` calls this before it records the sync cursor.
 * Resolves true only when the cache really holds this session's rows (a write succeeded), so the
 * cursor is never recorded for data that isn't stored: not started, not loaded yet, or write failed.
 */
export async function flushChatPersistence(): Promise<boolean> {
  blocked = false; // fresh server data was just applied, so writing is safe again
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  await writeNow();
  return baseline !== null;
}

/**
 * Forget what was written and stop writing (logout, tests) until the next successful fetch has
 * put fresh data in redux; see `flushChatPersistence`.
 */
export function resetChatPersistence(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  baseline = null;
  blocked = true;
}

/** Start saving redux chat changes. Returns a function that stops it. */
export function startChatPersistence(store: StoreLike, debounceMs = DEBOUNCE_MS): () => void {
  activeStore = store;
  let last = store.getState().chat;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void writeNow();
    }, debounceMs);
  };
  const unsubscribe = store.subscribe(() => {
    const chat = store.getState().chat;
    if (chat === last) return;
    last = chat;
    schedule();
  });
  schedule(); // state may already be loaded by the time this starts
  return () => {
    unsubscribe();
    if (timer) clearTimeout(timer);
    timer = null;
    if (activeStore === store) activeStore = null;
  };
}
