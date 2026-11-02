# Post analytics v2 rollout

## Rollout boundary

Analytics is telemetry only. This repair does not implement trends, change feeds, increment public view counters, or provide ranking inputs. Ship the trends MVP independently. Do not use either historical analytics or these new client-observed signals in ranking yet.

`Post_Analytics` retains all existing documents. New writes have `schemaVersion: 2`; reporting must explicitly filter on that version and must not mix legacy mount views, window scroll depth, or wall-clock page time with qualified exposure. No historical backfill or deletion is performed.

## Client semantics

- One random, memory-only UUID session per mounted post exposure. Post ID or current-user changes reset it. No localStorage, sessionStorage, analytics cookie, fingerprint, or persistent anonymous identifier.
- A view requires at least 50% intersection of the observed post element for at least one **continuous** second while `document.visibilityState` is `visible`. Losing exposure or hiding the document breaks qualification continuity.
- Active dwell accumulates only during those same visible/exposed intervals, including sub-second intervals; it is not wall-clock page age. After qualification, cumulative milestones are emitted once at 10, 30, 60 and 120 seconds. Dwell is capped at 30 minutes per exposure.
- One final `engagement` summary is emitted only for a qualified session. Pagehide and effect teardown share an idempotent finalizer; scrolling does not finalize or restart it. StrictMode's immediate setup/cleanup emits nothing.
- Pagehide/teardown retry outstanding events with unchanged event IDs and send the final summary through `sendBeacon`, falling back to `fetch` with `keepalive`. Normal delivery also uses keepalive. No durable offline queue or guaranteed delivery. A persisted bfcache pageshow starts a fresh exposure.
- No scroll events, window scroll metrics, raw user-agent, referrer URLs, or client-supplied identity are sent.

### Observed elements and integration coordination

Tracker mount sites were inspected but not edited. `PostCard` exposes a source identifier for reliable detail-page targeting:

- Detail: the hidden marker's next sibling contains the matching post article. `PostCard` declares its source `data-post-analytics-id` independently of the rendered content's `data-id`, so opening a repost credits that repost, not its original. Older markup falls back to an exact `data-id` match. This waits through loading and observes the actual post card, not its comments or page shell.
- Preview: the next sibling's loaded media carousel resolves to its media wrapper. Loading/error placeholders do not qualify.
- Active ExploreReel: the marker's immediate slide parent is observed only when its direct horizontal snap scroller contains media. Inactive slides do not mount a tracker in the existing integration.

A local MutationObserver resolves asynchronously loaded/replaced content. Unknown layouts fail closed (no target, no event); the hidden marker is never the observed target. These structural adapters depend on the current markup. For a future explicit integration, place `data-post-analytics-root` on the post/media wrapper **containing** the tracker; `resolvePostAnalyticsTarget` already supports it. Coordinate parent changes separately rather than modifying ExploreReel or other mount sites in this patch.

Known limitations: standard IntersectionObserver measures geometry, not attention or opaque overlay occlusion. Posts taller than twice the available viewport may never reach 50% of their full area and therefore will not qualify. Preview currently has no post-specific DOM identifier, so its local media-column resolution relies on the inspected mount contract; prefer an explicit per-post root when that parent is next edited. An article whose explicit source ID differs from the tracked route ID fails closed rather than crediting unrelated content. Browser timer/observer throttling, process termination and network loss can undercount. These are client-reported observations, not fraud-resistant proof of viewing.

## API and storage

`POST /api/analytics/track` accepts JSON up to 4 KiB. Payloads must supply schema version 2, a bounded post ID, UUIDv4 event/session IDs, and exactly one allowlisted shape:

- `view`: `{ activeMs, continuousVisibleMs: 1000 }`
- `time`: `{ activeMs, milestoneSeconds: 10 | 30 | 60 | 120 }`
- `engagement`: `{ activeMs }`

`activeMs` is an integer from 1,000 through 1,800,000 and must satisfy any milestone. Unknown events, legacy payloads, extra metadata and supplied user IDs are rejected. Values remain client claims; validation cannot establish that someone actually viewed a post.

Identity comes exclusively from the verified `velo_12` server cookie. An absent cookie permits anonymous public telemetry; a malformed/invalid cookie returns 401. Stored fields are the validated payload, server user ID if authenticated, semantic `eventKey`, and server `createdAt`; neither raw IPs nor request UA/referrer headers are stored.

Access is checked on Posts, Posts_Comments or Posts_Shares before insertion. `everyone` is public, `none` is owner-only, and `friends` permits the owner or an authenticated viewer with **both** active follow directions. Existing follow documents without a `follow` field count as active; explicit inactive documents do not. Missing/unknown visibility is denied, even for owners. Missing and inaccessible targets both return 404. A follow lookup failure returns 503, never permission.

Same-origin Origin is required, or (for Origin-less same-origin fetches) explicit `Sec-Fetch-Site: same-origin`. Cross-site and same-site requests are rejected. Configure `POST_ANALYTICS_ORIGIN` to the exact browser origin (scheme/host/port); `NEXTAUTH_URL` is the fallback canonical origin. Without either, the request host and proxy/TLS protocol are used. Reverse proxies must sanitize forwarded protocol headers.

Indexes initialize lazily before accepting writes:

1. Unique `(schemaVersion, eventId)`, partial to version 2: retries cannot duplicate an event.
2. Unique `(schemaVersion, sessionId, postId, eventKey)`, partial to version 2: regenerated event IDs cannot duplicate a view, milestone or final summary within a session.
3. A TTL index on `Post_Analytics_RateLimits.expiresAt`; its built-in unique `_id` protects atomic rate buckets.

Mongo permissions must permit index creation. Index/rate storage failures fail closed with 503. Old documents do not participate in new unique indexes and remain untouched. If v2 documents were written by a previous experimental deployment, resolve any conflicting v2 keys before creating these indexes; do not delete historical v1 data.

Rate limiting allows 120 valid requests per server-authenticated user or anonymous network per minute, across app instances and client session rotations. Retries also consume quota. Anonymous network identity is a server-secret HMAC that rotates daily and is stored only in short-lived rate buckets (expires roughly 1–2 minutes later; actual deletion depends on Mongo's TTL monitor). Set `POST_ANALYTICS_SECRET` or the existing `JWT_SECRET`; without either, ingestion returns 503. Only Vercel deployments (`VERCEL=1`) trust `x-forwarded-for`; otherwise the socket address is used. Other proxy/serverless deployments may group anonymous traffic under a shared proxy address and undercount; coordinate a trusted proxy adapter if needed. Anonymous session UUIDs alone are deliberately not rate keys. Shared networks can hit the quota. Fixed windows permit boundary bursts; this is a bounded abuse guard, not comprehensive bot prevention.

## Validation

Run from `velo`:

```sh
npm test -- --runInBand --watch=false --runTestsByPath src/lib/__tests__/postAnalytics.test.ts src/lib/__tests__/postAnalyticsServer.test.ts src/components/__tests__/PostAnalytics.test.tsx src/lib/__tests__/postAnalyticsApi.test.ts
npx tsc --noEmit --incremental false
```

Tests cover qualification continuity, active dwell, milestone/finalization dedup, per-post/identity resets, StrictMode, bfcache, current target resolution, loading fail-closed behavior, pending retries/keepalive, payload bounds, origin checks, server identity, visibility/mutual follows, rate bucket operations and partial-index configuration. Mongo operations and browser intersection/visibility are mocked: live Mongo unique-index races, production proxy behavior and browser layout/occlusion still require deployment smoke testing.
