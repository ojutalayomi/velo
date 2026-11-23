import type { ChatSnapshot } from "@/lib/chatCache";
import type { AllChats, MessageAttributes } from "@/lib/types/type";

/**
 * Incremental chat sync. A client that already holds a cached snapshot asks `GET /api/chats?since=`
 * for just what changed, instead of re-downloading hundreds of messages on every load.
 *
 * What counts as "changed" is decided server-side from `updatedAt`, which the socket server stamps
 * on insert, on delete (the placeholder row is the tombstone), and when reactions change. Read
 * receipts live in their own collection and are matched by `readAt`.
 */

/** Re-ask for this much before the cursor: absorbs write/read races, and merging is idempotent. */
export const SYNC_OVERLAP_MS = 60_000;
/** Past this age the cache is dropped and fully reloaded, bounding drift and cache growth. */
export const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Server side: a usable `since` ISO string, or null for "send everything". */
export function parseSince(raw: unknown, now = Date.now()): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value === "") return null;
  const ms = Date.parse(value);
  // An unparseable or future cursor can't be trusted to describe what the client holds.
  if (Number.isNaN(ms) || ms > now) return null;
  return new Date(ms).toISOString();
}

/**
 * Server side: Mongo filter for messages changed after `since`. Rows written before `updatedAt`
 * existed fall back to their `timestamp`.
 */
export function changedSinceFilter(since: string, receiptMessageIds: unknown[] = []) {
  return {
    $or: [
      { updatedAt: { $gt: since } },
      { updatedAt: { $exists: false }, timestamp: { $gt: since } },
      ...(receiptMessageIds.length > 0 ? [{ _id: { $in: receiptMessageIds } }] : []),
    ],
  };
}

/** Client side: the `since` value to send for a cached snapshot, or null to do a full load. */
export function sinceForCache(
  cached: { serverTime?: string } | null,
  now = Date.now()
): string | null {
  const t = cached?.serverTime ? Date.parse(cached.serverTime) : NaN;
  if (Number.isNaN(t) || now - t > MAX_CACHE_AGE_MS || t > now) return null;
  return new Date(t - SYNC_OVERLAP_MS).toISOString();
}

/** True when a `since` response was too big to be a delta, so the client should reload fully. */
export function deltaOverflowed(delta: AllChats): boolean {
  return delta.pagination?.messages?.hasMore === true;
}

/**
 * Apply a `since` response on top of the cached snapshot.
 * - Changed messages (including deletion placeholders) replace their cached copies.
 * - Messages of chats that vanished from the fresh chat list (chat deleted) are dropped.
 * - Chats, settings and the request id always come from the fresh response.
 * - Pagination stays the cached one: it describes how much older history is still unloaded.
 */
export function mergeDelta(cached: ChatSnapshot, delta: AllChats): AllChats {
  const freshChats = new Set((delta.chats ?? []).map((c) => String(c._id)));
  const knownChats = new Set((cached.conversations ?? []).map((c) => String(c.id)));

  const byId = new Map<string, MessageAttributes>();
  for (const m of cached.messages ?? []) {
    const chatId = m.chatId ? String(m.chatId) : "";
    const removed = chatId !== "" && knownChats.has(chatId) && !freshChats.has(chatId);
    if (!removed) byId.set(String(m._id), m);
  }
  for (const m of delta.messages ?? []) byId.set(String(m._id), m);

  return {
    ...delta,
    messages: [...byId.values()],
    pagination: cached.pagination ?? delta.pagination,
  };
}
