# Chat cache and incremental sync

Chats load from a local IndexedDB cache first, then ask the server only for what
changed since the cache was saved. This cuts the 500-message download on every
load, makes chats readable offline, and makes the first paint instant.

The server stays the source of truth. The cache is disposable: if it is missing,
stale, wrong-user or broken, the app does a normal full load.

## Files

| File | Role |
| --- | --- |
| `src/lib/chatCache.ts` | IndexedDB wrapper: `saveChatSnapshot`, `loadChatSnapshot(userId)`, `clearChatCache`, `isChatCacheSupported` |
| `src/lib/chatSync.ts` | Pure sync logic: `parseSince`, `changedSinceFilter`, `sinceForCache`, `deltaOverflowed`, `mergeDelta` |
| `src/lib/chatSyncServer.ts` | `buildMessageFilter(db, ...)`: builds the Mongo filter for `since` (including the read-receipt lookup) |
| `src/redux/chatSlice.ts` | `fetchChats(dispatch, userId?)` orchestrates cache, delta and fallback |
| `src/lib/class/ChatRepository.ts`, `chatSystem.ts` | `getChatsSince(since)` |
| `src/pages/api/chats.ts` | `GET /api/chats?since=` |
| `velo-socket/src/socket/chats.ts`, `src/lib/chatSocketHandler.ts` | Stamp `updatedAt` on messages |
| `src/app/accounts/logout/page.tsx` | Clears the cache on logout |

Tests in `src/lib/__tests__/`: `chatCache.test.ts` (uses `fake-indexeddb`),
`chatSync.test.ts`, and `chatSyncServer.test.ts` (mocked db).

## Load flow (`fetchChats`)

1. `loadChatSnapshot(userId)`. A snapshot is returned only if it was saved for
   that same user.
2. Offline: apply the cached snapshot and stop (before this, offline returned
   nothing).
3. Online with a cache: paint it immediately and clear the loading flag.
4. `loadFreshChats(cached)`:
   - `sinceForCache(cached)` gives the cursor, or `null`.
   - With a cursor, call `GET /api/chats?since=...` and `mergeDelta(cached, delta)`.
   - Otherwise, or if anything below goes wrong, do a full `getAllChats()`.
5. Apply the result to Redux and save it back to the cache (fire and forget).

Pagination for older history (`fetchMoreChatMessages`) is unchanged and still
fetches full pages with `messageSkip`.

### Full-load fallbacks

A delta is abandoned for a full load when:

- there is no cache, or the cache has no `serverTime`;
- the cache is older than `MAX_CACHE_AGE_MS` (7 days), which bounds drift and growth;
- the stored `serverTime` is in the future;
- the delta response has `pagination.messages.hasMore` (the client was away so
  long that the delta is itself a page; just reload);
- the delta request throws.

## `GET /api/chats?since=<ISO date>`

Same response shape as before, plus `serverTime` (the cursor for next time).
`since` is ignored, and a full response returned, if it is missing, not a valid
date, or in the future (`parseSince`). Paging params (`messageSkip`,
`messageLimit`) still apply to the filtered set.

The chat list, settings and participants are always returned in full. They are
small, and a full list is how the client notices a deleted chat.

`serverTime` is taken before any query runs. Anything written while the request
is being served is therefore re-sent on the next sync rather than lost.

### What counts as changed

A message is included if it is visible to the user and any of these holds:

| Change | How it is detected |
| --- | --- |
| New message | `updatedAt > since` (stamped by the server on insert) |
| Deleted message | `updatedAt > since`. Deletes are soft: the row is kept with placeholder content ending in `≤≤≤`, so the **placeholder is the tombstone** |
| Edited message | `updatedAt > since` (legacy REST edit stamps it) |
| Reaction added, changed or removed | The socket server stamps the message's `updatedAt`, because reactions live in their own collection |
| Read receipt | `readReceipts` rows with `readAt > since` are looked up first, and their messages are included |
| Old rows with no `updatedAt` | Fall back to `timestamp > since` |

`updatedAt` is stamped with the **server clock**, never the client's. A message's
own `timestamp` is client-supplied, so a skewed clock could otherwise hide a
message from `since`.

### Hard deletes

Deleting a whole chat removes its rows (`deleteMany`), so there is nothing to
return as a tombstone. `mergeDelta` handles it: any cached message whose chat
was in the cached chat list but is absent from the fresh one is dropped.
Messages whose chat was never in the cached list are kept.

## Merge rules (`mergeDelta`)

- Messages are keyed by `_id`; a delta copy replaces the cached copy, including
  deletion placeholders.
- Chats, settings, `requestId` and `serverTime` come from the delta.
- Pagination is the **cached** one. It describes how much older history is still
  unloaded, which the delta says nothing about.
- Conversations are rebuilt from the merged messages (`new Chat(chat, messages)`),
  so last-message and unread state stay correct.

`sinceForCache` backs the cursor off by `SYNC_OVERLAP_MS` (60 s). Merging is
idempotent, so the overlap costs a few repeated messages and protects against a
write that landed just after a previous read.

## Cache details (`chatCache.ts`)

Database `velo-chat-cache`, version 1:

- `messages` store: key `_id`, index `chatId`.
- `meta` store: one `snapshot` record (chats, settings, `requestId`,
  `pagination`, `serverTime`, `savedAt`).

Saving clears the `messages` store and rewrites it inside one transaction, so
messages removed on the server never linger. Every function resolves to a no-op
or `null` if IndexedDB is missing, `open()` throws (some private windows),
the open is blocked, or a transaction fails. Callers never need a guard.

The cache is cleared on logout so the next person on a shared browser cannot see
it, and it is also checked against the user id on every load.

## Deploying

1. Deploy the socket server first. Until it stamps `updatedAt`, deletes and
   reactions on existing messages do not appear in a delta. The 7-day cache
   limit caps how long that can last.
2. Then deploy the web app. Old clients ignore `since` and `serverTime`, so
   nothing breaks for them.

No migration is needed: old rows fall back to `timestamp`.

## Known limits

- The cache grows as deltas merge and is only trimmed by the 7-day full reload.
- Browsers may evict IndexedDB (Safari after ~7 days without a visit, or under
  disk pressure). The result is a normal full load.
- The legacy REST `deleteMyMessage` handler hard-deletes a row. If it is ever
  used, that message would stay in clients' caches until the next full load. The
  app deletes through the socket server (soft delete) today.
- `src/pages/api/chats.ts` connects to the database on the first request
  (`ensureDb()`), not at import, so the module can be imported in tests. A failed
  connect is not cached; the next request retries. Handler tests live in
  `chatsSinceRoute.test.ts`.
