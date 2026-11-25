# Statuses

A status is a 24 hour story: a photo or video, a text card, or a voice note. Code is in
`src/lib/statusServer.ts` (rules and queries), `src/app/api/statuses/**` (routes) and
`src/components/status/**` (composer, viewer). The socket server relays live events
(`velo-socket/src/socket/status.ts`) and re-reads the database for each one, so a client can
never claim a view, like or owner.

## Kinds

| Kind | Fields | Limits |
| --- | --- | --- |
| photo / video | `mediaUrl`, `mediaKey`, optional caption | up to 10 items per post |
| text | `text`, `background` (preset id from `statusBackgrounds.ts`) | 500 characters, one per post |
| voice | `mediaUrl`, `mediaKey`, `durationSec`, optional caption | 5 minutes, one per post |

`normalizeStatusBatch` validates the payload. Media URLs must be https links to our two S3
buckets (`isStatusFileUrl`). `createStatusForUser` (`statusCreate.ts`) inserts and broadcasts,
and is shared by `POST /api/statuses` and forwarding a chat message to status.

## Views and likes

- Everyone who can see a status gets `viewCount`, `likeCount` and `liked`.
- Only the owner gets the list of viewers (`GET /api/statuses/[id]/viewers`, with names and
  who liked). Followers never receive `viewers[]`.
- Likes are in `Status_Likes`, unique on (status, user). Liking tells the owner through an
  in-app notification and a `statusLiked` event.

## Replies

`POST /api/statuses/[id]/reply` finds or creates the DM with the owner and sends a message with
`statusReply: { statusId }`. The socket server swaps that for a snapshot of the status (thumbnail,
text, expiry). The chat shows it as a quoted card; tapping it opens the status while it is live.
Replies need a follow, no block, and a live status. Voice replies are not supported yet.

## Forward to status

`POST /api/statuses/forward { messageId }` accepts a text message, photo, video or voice note
from a chat the user is in (`statusForwardBlockReason`). Media is copied into the status bucket
first, so deleting the chat message never breaks the status. View once, deleted, call, poll,
contact, location and file messages are refused.
