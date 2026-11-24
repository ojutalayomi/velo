import type { ConvoType } from "@/lib/types/type";

/**
 * Chat pages saved for offline use without the person having opened them first.
 * Every chat in the list is a page of its own (`/chats/<id>`) plus a settings page, so the
 * service worker is asked to download the most recent ones in the background.
 */

/** How many chats get their pages saved: the most recent ones, pinned chats first. */
export const OFFLINE_CHAT_PAGES = 30;

/** The service worker's message type for this request (keep in sync with serviceworker/index.js). */
export const SAVE_PAGES_MESSAGE = "save-pages";

/** Where a chat lives. "Message yourself" has no settings page. */
export function chatPageUrls(chat: Pick<ConvoType, "id" | "type">): string[] {
  if (!chat?.id) return [];
  if (chat.type === "Personal") return ["/chats/me"];
  const base = chat.type === "Group" ? `/chats/group/${chat.id}` : `/chats/${chat.id}`;
  return [base, `${base}/settings`];
}

const time = (value: string | undefined) => {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** Page URLs for the chats worth keeping offline: pinned first, then newest, up to `limit` chats. */
export function pagesToSave(
  conversations: Array<Pick<ConvoType, "id" | "type" | "pinned" | "archived" | "timestamp">>,
  limit = OFFLINE_CHAT_PAGES
): string[] {
  const ranked = [...(conversations ?? [])]
    .filter((chat) => chat?.id)
    .sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      if (!!a.archived !== !!b.archived) return a.archived ? 1 : -1;
      return time(b.timestamp) - time(a.timestamp);
    })
    .slice(0, limit);
  return [...new Set(ranked.flatMap(chatPageUrls))];
}

/** Ask the service worker to save these pages. A no-op where there is no active worker. */
export async function requestPageSave(urls: string[]): Promise<boolean> {
  if (!urls.length || typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) return false;
    registration.active.postMessage({ type: SAVE_PAGES_MESSAGE, urls });
    return true;
  } catch {
    return false;
  }
}
