# Offline mode: chat cache, incremental sync, media and app shell

Velo behaves like a web app that is reloaded often, so it should not download the
same chats on every load, and it should keep working with no connection. Four
layers cooperate:

| Layer | Stores | Where |
| --- | --- | --- |
| Chat data | conversations, settings, messages, sync cursor | IndexedDB `velo-chat-cache` |
| Incremental sync | only what changed since the cursor | `GET /api/chats?since=` |
| Media | voice notes, images, videos, files | Cache API `velo-chat-media-v1` |
| App shell | page HTML, page data, JS/CSS, images, fonts | Service worker caches |
| Who is signed in | the user profile | `localStorage` `userData` |

The server stays the source of truth. Every cache is disposable: if it is missing,
stale, wrong-user or broken, the app falls back to a normal online load.

## Files

| File | Role |
| --- | --- |
| `src/lib/chatCache.ts` | IndexedDB wrapper: `persistChatChanges`, `saveChatMeta`, `loadChatSnapshot(userId)`, `clearChatCache`, `isChatCacheSupported` |
| `src/redux/chatPersistence.ts` | Live writer: watches the Redux store and writes changed rows (`startChatPersistence`, `flushChatPersistence`, `resetChatPersistence`) |
| `src/lib/chatSync.ts` | Pure sync logic: `parseSince`, `changedSinceFilter`, `sinceForCache`, `deltaOverflowed`, `mergeDelta` |
| `src/lib/chatSyncServer.ts` | `buildMessageFilter(db, ...)`: Mongo filter for `since`, including the read-receipt lookup |
| `src/redux/chatSlice.ts` | `fetchChats(dispatch, userId?)` orchestrates cache, delta and fallback |
| `src/lib/class/ChatRepository.ts`, `chatSystem.ts` | `getChatsSince(since)` |
| `src/pages/api/chats.ts` | `GET /api/chats?since=` |
| `velo-socket/src/socket/chats.ts`, `src/lib/chatSocketHandler.ts` | Stamp `updatedAt` on messages |
| `src/lib/mediaCache.ts`, `src/hooks/useCachedMedia.ts`, `src/components/chat/CachedMedia.tsx` | Media files in the Cache API |
| `serviceworker/index.js` (copied to `public/sw.js`) | Push handlers plus the app-shell cache |
| `src/lib/serviceWorker.ts` | Registration (`registerServiceWorker`), `clearOfflineShell` |
| `src/app/offline/page.tsx` | Fallback page for a route that was never saved |
| `src/lib/userCache.ts`, `src/app/providers/UserProvider.tsx` | Saved profile, offline sign-in |
| `src/app/accounts/logout/page.tsx` | Clears everything on logout |

Tests: `chatCache`, `chatPersistence`, `chatSync`, `chatSyncServer`,
`chatsSinceRoute`, `fetchChatsShared`, `mediaCache`, `serviceWorkerShell`,
`userCache` (all in `src/lib/__tests__/`), and `UserProvider.test.tsx`.
Run them with `NODE_ENV=test npm test`.

## 1. Chat data in IndexedDB

Database `velo-chat-cache`, version 2:

| Store | Key | Holds |
| --- | --- | --- |
| `messages` | `_id` (index `chatId`) | messages |
| `conversations` | `id` | the chat list, in the shape the UI reads |
| `settings` | `chatId` | per-chat settings (`{ chatId, value }`) |
| `meta` | `"meta"` | `requestId` (the user), `pagination`, `serverTime` (sync cursor), `savedAt` |

Upgrading from v1 drops the old combined snapshot; the next load is one normal
full fetch, so no migration code is needed.

Every function resolves to a no-op or `null` if IndexedDB is missing, `open()`
throws (some private windows), the open is blocked, or a transaction fails.
Callers never guard.

### Single-writer rule

Rows are written by one place, the live persister. It subscribes to the Redux
store (debounced 500 ms), compares item references, and writes only changed rows
and deletions. So a pin, mute, unread count or new message is saved as it happens,
not only after a server fetch.

- It writes nothing while `loading` is true or `userId` is empty, so a half-loaded
  state is never saved. The first write of a session replaces everything.
- `fetchChats` writes the cursor (`saveChatMeta`) only **after**
  `flushChatPersistence()` reports the rows were stored. The cursor therefore never
  runs ahead of the data it describes.
- On logout `resetChatPersistence()` blocks writes until the next fetch, so the old
  user's state cannot be written back after the cache is cleared.

## 2. Load flow (`fetchChats`)

Calls with a `userId` that are already running share one request (no duplicate
`/api/chats` on a reload). The root component waits for the user id before
fetching, because without it the cache cannot be looked up.

1. `loadChatSnapshot(userId)`. A snapshot is returned only if `meta.requestId`
   matches that user.
2. **Offline:** apply the snapshot and stop.
3. **Online with a cache:** paint it immediately and clear the loading flag.
4. `loadFreshChats(cached)`:
   - `sinceForCache(cached)` gives the cursor, or `null`.
   - With a cursor, call `GET /api/chats?since=...` and `mergeDelta(cached, delta)`.
   - Otherwise, or if anything goes wrong, do a full `getAllChats()`.
5. Apply the result to Redux, clear `loading`, flush the persister, then save the
   cursor.

Older history (`fetchMoreChatMessages`) is unchanged and still fetches full pages
with `messageSkip`.

### Full-load fallbacks

A delta is abandoned for a full load when:

- there is no cache, or the cache has no `serverTime`;
- the cache is older than `MAX_CACHE_AGE_MS` (7 days);
- the stored `serverTime` is in the future;
- the delta response has `pagination.messages.hasMore` (the client was away so
  long that the delta is itself a page);
- the delta request throws.

## 3. `GET /api/chats?since=<ISO date>`

Same response shape as before, plus `serverTime` (the cursor for next time).
`since` is ignored, and a full response returned, if it is missing, not a valid
date, or in the future (`parseSince`). Paging params (`messageSkip`,
`messageLimit`) still apply to the filtered set.

The chat list, settings and participants are always returned in full. They are
small, and a full list is how the client notices a deleted chat.

`serverTime` is taken before any query runs, so anything written while the request
is served is re-sent next time rather than lost.

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

`updatedAt` uses the **server clock**, never the client's. A message's own
`timestamp` is client-supplied, so a skewed clock could otherwise hide a message
from `since`.

### Hard deletes

Deleting a whole chat removes its rows, so there is nothing to return as a
tombstone. `mergeDelta` handles it: any cached message whose chat was in the
cached conversation list but is absent from the fresh one is dropped.

### Merge rules (`mergeDelta`)

- Messages are keyed by `_id`; a delta copy replaces the cached copy, including
  deletion placeholders.
- Chats, settings, `requestId` and `serverTime` come from the delta.
- Pagination is the **cached** one: it describes how much older history is still
  unloaded, which the delta says nothing about.
- Conversations are rebuilt from the merged messages so last-message and unread
  state stay correct.

`sinceForCache` backs the cursor off by `SYNC_OVERLAP_MS` (60 s). Merging is
idempotent, so the overlap costs a few repeated messages and protects against a
write that landed just after a previous read.

## 4. Media files (Cache API)

IndexedDB stores message records (file URL, name, size), not the files. Files live
in the Cache API, cache `velo-chat-media-v1`, saved on **first view or play**
(no prefetching).

- Files are fetched explicitly with `mode: "cors"` and stored whole. They are not
  cached by a service-worker intercept: `<audio>`/`<video>` ask for byte ranges
  (206), which the Cache API refuses, and `<img>` loads are opaque and count about
  7 MB each against the quota.
- Only complete `200` responses and only `http(s)` URLs are stored (a `blob:`
  draft recording is never cached). Playback uses a `blob:` URL.
- Limits: 25 MB per audio, image or file; 50 MB per video; 200 MB in total. Larger
  files keep streaming from the network.
- The Cache API has no "last used" time, so a small IndexedDB `velo-media-index`
  tracks `{ url, size, lastUsed }`; the least recently used files go first.
- Everything degrades to "use the network URL": no Cache API, a failed fetch, a
  file over the cap, a full quota.
- The S3 bucket's CORS allows GET only from `https://velo-virid.vercel.app`, so
  media is not cached on `localhost`.

## 5. App shell (service worker)

`serviceworker/index.js` keeps the push handlers and, when registered as
`/sw.js?shell=1`, caches the app so it opens offline. `public/sw.js` is generated
from it by `npm run sync:sw` (run automatically by `predev` and `prebuild`); edit
the source in `serviceworker/`.

The shell is on for production builds. For `next dev`, set
`NEXT_PUBLIC_OFFLINE_SHELL=1`.

| Request | Strategy | Cache |
| --- | --- | --- |
| Page navigation | network first (4 s timeout), saved copy on failure | `velo-pages-v1` |
| Page data (RSC) for a navigation | network first, saved copy on failure | `velo-pages-v1` |
| `/_next/static/*` | cache first (content-hashed) | `velo-static-v1` |
| Images, fonts | stale while revalidate | `velo-assets-v1` |
| Prefetches, `/api/`, `/accounts`, `/auth`, `/admin`, `/sw.js`, Range requests, other origins | never touched | none |

Only complete, non-redirected, successful responses are saved. A route that was
never saved shows `/offline`.

**Why page data is cached too.** Right after a chat page loads, Next requests that
page's data from the server. Offline the request fails, so Next reloads the page,
which makes the same request again: an endless reload loop. Answering that request
from the saved copy ends it. The saved copy is used only when the network fails, so
online pages are never stale.

**Saving chats ahead of time.** Once the chat list has loaded (and after 5 s), the
app (`src/lib/offlinePages.ts`) sends the worker a `save-pages` message listing the
pages of the 30 most recent chats (pinned first, archived last): `/chats/<id>` or
`/chats/group/<id>`, each with its `/settings` page, and `/chats/me`. The worker
downloads them one at a time and keeps the good ones, so these open offline without
having been visited. A page saved in the last 12 hours is skipped; only `/chats/...`
paths are accepted. The page cache holds up to 200 entries.

The chat page used to call `router.replace` to its own URL on every load
(`ChatTextarea.tsx`, the `toggleDialog` effect). That made Next re-request the page
from the server each time, which is what broke saved pages offline. It now navigates
only when the URL would actually change.

Updating the worker: a new `/sw.js` takes over on the next load; old
`velo-(static|pages|assets)-*` caches are removed on activate.

## 6. Knowing who is signed in offline

The cached chats are keyed by user, so the app must know the user id with no
network. `userCache.ts` keeps the profile in `localStorage` (`userData`).

- Online it is a 60-second cache that saves a request on quick reloads.
- Offline, and whenever `/api/getuser` fails (even if the browser still says
  "online", as the DevTools service-worker "Offline" box does), the last saved
  profile is used however old it is. It is refreshed when the connection returns
  or on the next load.
- Logout clears it.

## 7. Sending while offline (outbox)

Text messages written offline (or while the connection drops) are kept and sent
automatically. Files still need a connection: sending one offline shows a message
saying so.

- `src/lib/outbox.ts` is its own IndexedDB database, `velo-outbox`, separate from
  the chat cache (which is rewritten from the server and must never wipe unsent
  messages).
- A message is saved there **before** it is emitted, in the DM and group chat
  pages. It is removed when the server's own copy comes back: the sender receives
  their message through the same `newMessage` event as everyone else
  (`handleChatMessage` in `src/app/clientComps.tsx`). So a closed tab, a reload or a
  dropped connection never loses it. Bot chats are not queued.
- The socket server ignores a message whose `_id` it already saved, which is what
  makes resending safe.
- `src/hooks/useOutbox.ts` (mounted in the root component):
  - after the chats have loaded it shows waiting messages again as "sending" (they
    are not in the server's data or the chat cache);
  - it sends them when the socket connects, when the browser comes back online,
    and every 15 s while any are left. A message is not resent within 10 s of the
    last try;
  - after 5 attempts a message is marked "failed" and dropped from the outbox.
- Logout clears the outbox, so the next person to sign in on the browser cannot
  send someone else's messages. Each queued row is also tied to its user id.

## 8. Logout

`logout/page.tsx` calls `resetChatPersistence()`, `clearChatCache()`,
`clearMediaCache()`, `clearOfflineShell()` and `clearCachedUser()`, so the next
person on a shared browser sees none of it. The cache is also checked against the
user id on every load.

## 9. Deploying

1. Deploy the socket server first. Until it stamps `updatedAt`, deletes and
   reactions on existing messages do not appear in a delta. The 7-day cache limit
   caps how long that can last.
2. Then deploy the web app. Old clients ignore `since` and `serverTime`, so
   nothing breaks for them.

No migration is needed: old rows fall back to `timestamp`. To go offline, a device
must load the app once online on the new build; chat page data and media are saved
as they are opened.

## 10. Testing offline in DevTools

- The service-worker panel's "Offline" box fails requests but the browser may still
  report `navigator.onLine` as true; the Network panel's "Offline" throttle also
  sets it to false. Test both.
- Open each page once online first. A chat or page that was never visited cannot
  open offline.
- Check Application: Cache storage (`velo-pages-v1`, `velo-static-v1`,
  `velo-assets-v1`, `velo-chat-media-v1`), IndexedDB (`velo-chat-cache`, rows in
  `conversations`, `messages`, `settings`, `meta`), and Local Storage `userData`.

## Known limits

- Only the 30 most recent chats are saved ahead of time. Older chats open offline only if they were visited online.
- Only text messages can be sent offline; files, and the first message of a brand-new chat, need a connection. A queued message that the server rejects (for example, you were removed from the chat) is retried 5 times and then shown as failed.
- The chat cache grows as deltas merge and is trimmed only by the 7-day full
  reload. The page caches are capped by entry count.
- Browsers may evict stored data (Safari after about 7 days without a visit, or
  under disk pressure). The result is a normal online load.
- The legacy REST `deleteMyMessage` handler hard-deletes a row. If it were used,
  that message would stay in clients' caches until the next full load. The app
  deletes through the socket server (soft delete).
- `src/pages/api/chats.ts` connects to the database on the first request
  (`ensureDb()`), not at import, so the module can be imported in tests. A failed
  connect is not cached; the next request retries.
- After falling back to a saved profile while the browser still reports "online",
  the profile is refreshed on the next load, not the moment requests start working.
