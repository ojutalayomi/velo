# Trends MVP

`GET /api/trends?limit=5` is public. `limit` must be a single decimal integer in
1..20; omitted means 5. Invalid limits return 400; non-GET methods return 405.

```json
{
  "data": [{ "tag": "velo", "postCount": 8, "authorCount": 4 }],
  "windowHours": 24,
  "generatedAt": "2026-11-02T12:00:00.000Z"
}
```

## Client imports

Import only from `@/lib/trends` (no server dependencies):

- `TrendsResponse`, `Trend`
- `TREND_CACHE_TTL_MS` = 300000
- `TREND_WINDOW_HOURS` = 24
- `TREND_MAX_LIMIT` = 20
- `TREND_SIDEBAR_LIMIT` = 5
- `TREND_MIN_AUTHORS` = 3
- `extractHashtags`, `parseTrendLimit`, `TREND_HASHTAG_PATTERN`

Tags are lowercase ASCII, **without `#`**. Prefix `#` for display and use the
bare tag for the existing `/api/hashtag/[tag]` endpoint. Extraction matches the
renderer: `#\w+` (ASCII letters/digits/underscore), including embedded tokens;
e.g. `#café` contributes `caf`. Each post contributes at most once per tag.

## Ranking and storage

Only `Posts` with exact `Visibility: "everyone"` and `Type: "post"` qualify.
No shares/comments, joins, personalization, or raw analytics events are used.
Posts must have a non-whitespace string author ID. Author IDs are trimmed before
distinct counting. A tag needs at least three distinct authors, then sorts by
author count descending, post count descending, newest qualifying post descending,
and tag ascending (simple/binary collation). Only summary counts are returned.

The range is inclusive `[generatedAt - 24h, generatedAt]`; future posts are
excluded. `PostMaker.tsx` writes `TimeOfPost` using `new Date().toISOString()`;
the socket backend preserves that value (or supplies its own ISO string).
The aggregation intentionally compares these ISO strings to use the compound
`{ Visibility: 1, Type: 1, TimeOfPost: -1 }` index. Noncanonical legacy timestamp
formats need a separate migration, not an unindexed date conversion here.

Index setup is coalesced/cached per Mongo client/database and retries after
failure. The database principal needs permission to create this index. Both index
creation and aggregation have a 10-second MongoDB execution limit; the aggregate
hints the index. This does not change the shared client's connection timeout.

## Cache and privacy

All request limits slice a single full top-20 snapshot cached for five minutes
per process (not a distributed cache). Concurrent refreshes coalesce. TTL begins
when loading completes; `generatedAt` is the query's time cutoff, not response time.
A failed refresh returns 500, is not cached, and is retried by the next request;
expired snapshots are not served as fallback.

HTTP responses use `Cache-Control: no-store` on success and errors. This disables
browser/CDN caching without disabling the server application snapshot cache.
Clients may explicitly reuse their own in-memory snapshot for
`TREND_CACHE_TTL_MS`; HTTP caches must not add another freshness window.
Visibility changes/deletions can remain reflected in aggregate counts until the
next refresh, at most one application TTL after snapshot completion.

Caption search (text and hashtag) now filters all three collections to public
posts before pagination. Hashtag queries accept only complete ASCII tag names
and cannot match longer tag prefixes. Search intentionally retains public shares
and comments; trends do not include them.

## User interface

`TrendingTopics` renders five entries in `RightSideBar` and up to twenty at
`/trending`. Explore links to the full page on desktop and mobile. Entries link
to the existing hashtag feed. Loading, empty, retry, and stale-on-error states
are explicit; no sample/fallback trends are fabricated.

`trendsClient.ts` shares the full response and concurrent request across mounts.
Its expiry uses `generatedAt`, so it does not add another five minutes to an
old server snapshot. Mounted views check freshness every minute and on focus or
visibility restoration; hidden documents do not poll the endpoint. Requests time
out after 15 seconds. This is in-memory SPA caching, not persistent storage.

Analytics v2 is shipped separately; see `postAnalytics.md`. Do not add analytics
boosts or migrate historical events into ranking until exposure coverage has
been reviewed against real traffic. Later steps are an offline comparison of
activity-only vs. qualified-interest rankings and time-bucket aggregation if
raw-event volume warrants it; neither is enabled automatically by this rollout.

## Validation

Backend unit tests live in `src/lib/__tests__/trends*.test.ts` and
`postSearch.test.ts`. MongoDB is mocked: pipeline/index/query invariants and cache
and HTTP behavior are covered, but these tests do not replace an integration
run against a deployed MongoDB instance.
