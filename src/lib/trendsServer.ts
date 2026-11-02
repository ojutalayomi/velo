import type { Db, Document, MongoClient } from "mongodb";

import { MongoDBClient } from "@/lib/mongodb";
import {
  TREND_CACHE_TTL_MS,
  TREND_HASHTAG_PATTERN,
  TREND_MAX_LIMIT,
  TREND_MIN_AUTHORS,
  TREND_WINDOW_HOURS,
  type Trend,
  type TrendsResponse,
} from "@/lib/trends";

export const TREND_QUERY_MAX_TIME_MS = 10_000;
export const TREND_INDEX_NAME = "trends_visibility_type_time";

const indexPromises = new WeakMap<MongoClient, Map<string, Promise<void>>>();

/** Coalesce index setup per actual client/database, not per short-lived wrapper. */
export function ensureTrendIndexes(db: Db): Promise<void> {
  let databases = indexPromises.get(db.client);
  if (!databases) {
    databases = new Map();
    indexPromises.set(db.client, databases);
  }
  const existing = databases.get(db.databaseName);
  if (existing) return existing;
  const pending = Promise.resolve()
    .then(async () => {
      await db.collection("Posts").createIndex(
        { Visibility: 1, Type: 1, TimeOfPost: -1 },
        {
          name: TREND_INDEX_NAME,
          maxTimeMS: TREND_QUERY_MAX_TIME_MS,
          collation: { locale: "simple" },
        }
      );
    })
    .catch((error: unknown) => {
      databases.delete(db.databaseName);
      throw error;
    });
  databases.set(db.databaseName, pending);
  return pending;
}

/** ISO strings are written by PostMaker; keep the indexed time range as strings. */
export function buildTrendsPipeline(now: Date): Document[] {
  const start = new Date(now.getTime() - TREND_WINDOW_HOURS * 60 * 60 * 1000);
  return [
    {
      $match: {
        Visibility: "everyone",
        Type: "post",
        TimeOfPost: { $gte: start.toISOString(), $lte: now.toISOString() },
        UserId: { $type: "string" },
      },
    },
    {
      $project: {
        author: { $trim: { input: "$UserId" } },
        TimeOfPost: 1,
        tags: {
          $setUnion: [
            {
              $map: {
                input: {
                  $regexFindAll: {
                    input: { $cond: [{ $eq: [{ $type: "$Caption" }, "string"] }, "$Caption", ""] },
                    regex: TREND_HASHTAG_PATTERN,
                  },
                },
                as: "token",
                in: { $toLower: { $arrayElemAt: ["$$token.captures", 0] } },
              },
            },
            [],
          ],
        },
      },
    },
    { $match: { author: { $ne: "" } } },
    { $unwind: "$tags" },
    // Group by author first to avoid collecting an unbounded array of author IDs.
    {
      $group: {
        _id: { tag: "$tags", author: "$author" },
        postCount: { $sum: 1 },
        latestPost: { $max: "$TimeOfPost" },
      },
    },
    {
      $group: {
        _id: "$_id.tag",
        postCount: { $sum: "$postCount" },
        authorCount: { $sum: 1 },
        latestPost: { $max: "$latestPost" },
      },
    },
    { $match: { authorCount: { $gte: TREND_MIN_AUTHORS } } },
    { $sort: { authorCount: -1, postCount: -1, latestPost: -1, _id: 1 } },
    { $limit: TREND_MAX_LIMIT },
    { $project: { _id: 0, tag: "$_id", postCount: 1, authorCount: 1 } },
  ];
}

export async function loadTrendsSnapshot(): Promise<TrendsResponse> {
  const wrapper = await new MongoDBClient().init();
  const db = await wrapper.getDb();
  await ensureTrendIndexes(db);
  const now = new Date();
  const data = await db
    .collection("Posts")
    .aggregate<Trend>(buildTrendsPipeline(now), {
      maxTimeMS: TREND_QUERY_MAX_TIME_MS,
      hint: TREND_INDEX_NAME,
      collation: { locale: "simple" },
    })
    .toArray();
  return { data, windowHours: TREND_WINDOW_HOURS, generatedAt: now.toISOString() };
}

/** A failed refresh is never cached; the next request retries without serving stale data. */
export function createTrendsCache(
  load: () => Promise<TrendsResponse>,
  clock: () => number = Date.now
): () => Promise<TrendsResponse> {
  let cached: { snapshot: TrendsResponse; expiresAt: number } | undefined;
  let inFlight: Promise<TrendsResponse> | undefined;
  return () => {
    if (cached && clock() < cached.expiresAt) return Promise.resolve(cached.snapshot);
    if (inFlight) return inFlight;
    inFlight = Promise.resolve()
      .then(load)
      .then((snapshot) => {
        cached = { snapshot, expiresAt: clock() + TREND_CACHE_TTL_MS };
        return snapshot;
      })
      .finally(() => {
        inFlight = undefined;
      });
    return inFlight;
  };
}

// Shared by all callers in this process, including development module reloads.
const processCache = globalThis as typeof globalThis & {
  __veloTrendsCache?: ReturnType<typeof createTrendsCache>;
};
export const getTrendsSnapshot = (processCache.__veloTrendsCache ??=
  createTrendsCache(loadTrendsSnapshot));
