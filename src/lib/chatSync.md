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
| `src/lib/outbox.ts`, `src/hooks/useOutbox.ts` | Messages written offline: queue, restore after reload, resend |
| `src/app/providers/SocketProvider.tsx` | Creates the socket once the browser is online (also for a page opened offline) |
| `src/lib/offlinePages.ts` | Which chat pages are saved ahead of time |
| `src/lib/feedCache.ts`, `src/app/providers/PostsProvider.tsx` | Home feeds saved in IndexedDB, painted first, shown offline |
| `src/lib/offlineFiles.ts` | The "files need a connection" check shared by the chat pages and the file preview |
| `src/app/accounts/logout/page.tsx` | Clears everything on logout |

Tests: `chatCache`, `chatPersistence`, `chatSync`, `chatSyncServer`,
`chatsSinceRoute`, `fetchChatsShared`, `mediaCache`, `serviceWorkerShell`,
`userCache`, `offlinePages`, `outbox`, `feedCache`, `offlineFiles`, `chatUnread` (all in `src/lib/__tests__/`),
`src/hooks/__tests__/useOutbox.test.tsx`, and the provider tests in
`src/app/providers/__tests__/` (`UserProvider`, `SocketProvider`, `PostsProvider`).
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

- Files are fetched explicitly with `mode: "cors"` and `cache: "reload"` (without `reload`, Chrome reuses the copy an `<img>` loaded without CORS, which has no CORS headers, and the fetch fails) and stored whole. They are not
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
- Sending needs a socket. `SocketProvider` follows the connection (it creates the
  socket the first time the browser is online, and keeps it through dropouts, since
  socket.io reconnects by itself). It used to read the connection once at page load,
  so a page opened or reloaded offline never got a socket, and queued messages could
  not be sent after reconnecting.

### Cases that are not queued

| Case | What happens |
| --- | --- |
| Text message in a DM or group | Queued, shown as "sending", sent on reconnect |
| File attached, while offline | Blocked with "You're offline: Files can only be sent when you're online." Nothing is sent or queued, and the file preview stays open with the picked files and caption, so nothing is hidden or lost (`src/lib/offlineFiles.ts`) |
| First message of a brand-new chat | The chat has to be created on the server first, so it fails with "Failed to send message: Failed to fetch". The typed text stays in the box, nothing navigates, no chat is created |
| Chat with a bot | Not queued (the reply comes from an HTTP call) |
| Server rejects a queued message | Retried 5 times (about 90 s), then marked "failed" and removed from the outbox |

## 8. Home feeds

The first page of each home feed (For You, Following, and the status avatars) is kept
in IndexedDB `velo-feed-cache` (`src/lib/feedCache.ts`, store `feeds`, key `forYou` |
`following` | `status`; each row holds the user id, the posts, the pagination and a
save time). `PostsProvider` uses it:

- once the user is known it paints the saved feeds at once, then loads the fresh ones
  and replaces them; the fresh page is saved for the next load;
- a saved feed stays on screen if the refresh fails (weak or dropped connection);
- offline with a saved feed it shows that feed and makes no requests; offline with
  nothing saved it shows an "You're offline" state (with a Try again button) instead of
  loading forever or claiming that nobody has posted. The same state appears when a feed
  is empty because the server request failed;
- like the sockets, it follows the connection: a page opened offline loads the fresh
  feeds when the network returns, and a change in connection *quality* does not refetch;
- rows belong to one user, and logout clears them.

Only the first page is kept. The call provider (`src/app/providers/WithCallProvider.tsx`) is always rendered, with an inert stand-in socket until the real one exists. It used to be added only once the socket appeared, which remounted the whole app and fetched the feeds twice on a cold load. Older pages (loaded by scrolling) are fetched online only.

Post images go through `next/image`, so the service worker's image cache saves each one
you view (up to 200 entries, `velo-assets-v1`) and they show offline. Videos stream and
are not cached. The feeds are read-only offline: likes, bookmarks, comments and new posts
need a connection.

### Notifications

`/notifications` is saved ahead of time with the chat pages (the service worker's `save-pages`
list now accepts it). The page keeps the first page of each tab (All, Mentions, Verified) in the
`feeds` store of `velo-feed-cache` under `notifications:<tab>`. When a load fails it shows that
copy with an "offline" note instead of an error, and it does not mark anything read until a real
load succeeds (the mark-read retries on reconnect). Load more and push settings need a connection.
Verified in a real browser (section 12).

### Profile, Trending and suggested people

- **Profiles:** your own profile page (`/<username>`) is saved ahead of time; any profile you open is
  kept by the service worker's normal page cache. The save list accepts a single-segment path except
  reserved ones (`api`, `accounts`, `auth`, `admin`, `_next`, `sw.js`).
- **Trending:** the last good list is kept in `localStorage` (`velo-trends-snapshot`, not user
  specific) and shown with "Couldn't refresh trends. Showing the previous list." when a request fails.
- **Suggested people:** saved under `suggestions` in `velo-feed-cache` (per user, cleared on logout)
  and shown when the request fails.

## 9. Logout

`logout/page.tsx` calls `resetChatPersistence()`, `clearChatCache()`,
`clearMediaCache()`, `clearOfflineShell()` and `clearCachedUser()`, so the next
person on a shared browser sees none of it. The cache is also checked against the
user id on every load.

## 10. Deploying

1. Deploy the socket server first. Until it stamps `updatedAt`, deletes and
   reactions on existing messages do not appear in a delta. The 7-day cache limit
   caps how long that can last.
2. Then deploy the web app. Old clients ignore `since` and `serverTime`, so
   nothing breaks for them.

No migration is needed: old rows fall back to `timestamp`. To go offline, a device
must load the app once online on the new build; chat page data and media are saved
as they are opened.

## 11. Testing offline in DevTools

- The service-worker panel's "Offline" box fails requests but the browser may still
  report `navigator.onLine` as true; the Network panel's "Offline" throttle also
  sets it to false. Test both.
- Open each page once online first. A chat or page that was never visited cannot
  open offline.
- Check Application: Cache storage (`velo-pages-v1`, `velo-static-v1`,
  `velo-assets-v1`, `velo-chat-media-v1`), IndexedDB (`velo-chat-cache`, rows in
  `conversations`, `messages`, `settings`, `meta`), and Local Storage `userData`.

## 12. Verified in a real browser

Run with Puppeteer against the deployed site (offline set through the Network
conditions, so `navigator.onLine` was false).

| Scenario | Result |
| --- | --- |
| Open the chat list offline after a reload | The saved user, 13 conversations and 262 messages load |
| Open chats and settings pages never visited, offline (12 pages in one run, 6 in another) | All open with their content, no reload loop. Before the page-data fix the chat page reloaded endlessly (8+ navigations); after it, 3 |
| Pages saved ahead of time | Cleared the saved pages, reloaded online: 27 pages saved by the background save within about 30 s |
| Page opened while the browser says "online" but API calls fail, with an old saved profile | Falls back to the saved profile; the chat list shows |
| DM: 2 texts offline, reload offline, reconnect | Both shown as "sending", still queued after the reload, both sent after reconnecting (about 10 s), outbox empty, exactly 2 copies on the server |
| Group: same | Same result, outbox empty within 5 s |
| File attached offline | Blocked with the offline notice; nothing sent or queued. (Before the fix, the preview closed and left the files staged out of sight; now it stays open) |
| First message of a new chat, connection lost | Error toast, text kept, no chat created |
| Queued message the server rejects | Attempts went 0 to 5, then the message left the outbox after about 90 s |
| Notifications offline, first version | Error "Could not load notifications" although a copy was saved: the load ran before the offline sign-in restored the user id, so the saved copy was looked up with an empty id. Fixed by retrying once the user is known |
| Notifications offline, after the fix (both offline modes) | Page opens, shows the saved list with "You're offline. Showing what was saved on this device."; unread badge stays at 12 (nothing marked read) |
| Own profile `/<username>` offline, never visited (both modes) | Opens with posts, bio and counts; saved ahead of time |
| Home feed, Trending, suggested people offline (both modes) | Feed shows; Trending shows "Couldn't refresh trends. Showing the previous list."; suggested people show the saved list |
| Back online after the above | `/notifications` loads the live list and marks it read |

Not tested live: other people's profiles offline (only ones opened before work), the Mentions and
Verified notification tabs (same code as All), the red "failed" marker on a rejected message (covered by unit
tests), sending files (not supported), a phone-width layout, and offline use of
cached media inside the chats.

Tips for testing:

- Don't open `velo-outbox` from a script or the console with a plain
  `indexedDB.open("velo-outbox")` before the app has: that creates an empty database
  with no `queue` store and breaks queueing. Check `indexedDB.databases()` first, or
  delete the database to recover.
- Test with real messages in a chat where the extra messages are harmless. There is
  no "message yourself" chat unless the account has one (`/chats/me` shows an empty
  page otherwise).
- The attachment type filter rejects some files (for example `.txt`) before the
  offline check runs; use an image.

## Fields added with status replies, pins and view once

A new message field has to be added in six places or it silently disappears: both `Message`
types, both `ChatMessage` classes (constructor and `toMessageAttributes`), and the socket
handler (`chatSocketHandler.ts`). The stored copy keeps unknown fields, so persistence needs
no change.

| Field | Lives on | How it reaches every cache layer |
| --- | --- | --- |
| `statusReply` | message | Built by the server from the status itself (never trusted from the client). Travels like any message field, so IndexedDB and the `since` sync carry it. |
| `pinnedMessages` | chat (`ConvoType`) | The chat payload is always sent in full, so no `since` bump is needed. Live changes arrive as `pinnedMessagesUpdated` (queued offline like other chat events) and replace the whole list. Deleting a message removes it from the pins on the server. |
| `viewOnce`, `viewOnceOpenedBy`, `viewOnceGone` | message | Flags only. Opens bump the message's `updatedAt`, so a device that was offline gets the new state from the next `since` sync. |

### View once is never cached

A view once message has `attachments: []` in every payload, in `GET /api/chats`, in the Redis
offline queue and in pushes. Its file link exists only in the answer to the `openViewOnce`
socket event, one time per person. So there is nothing for IndexedDB, the Cache API or the
service worker to save, and none of them may be given the link either: the viewer uses a
plain `<img>`, `<video>` or `<audio>` element and does not call `mediaCache`.

The server stores who opened it (`viewOnceOpens`, a map of user id to time) and
`viewOnceDeleteAfter`. The file is deleted by `sweepViewOnce` (every minute) after the last
recipient opened it plus a grace period longer than any link, or 24 hours after sending.
`GET /api/chats` strips both server-only fields and sends `viewOnceOpenedBy` as a list of ids.

## Known limits

- Notifications, Trending and suggested people show the last saved copy; load more, likes, follows and comments need a connection. Profiles other than your own work offline only after being opened once.
- Only the 30 most recent chats are saved ahead of time. Older chats open offline only if they were visited online.
- Only text messages can be sent offline; files, and the first message of a brand-new chat, need a connection (see the table in section 7). A queued message that the server rejects (for example, you were removed from the chat) is retried 5 times and then shown as failed.
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
