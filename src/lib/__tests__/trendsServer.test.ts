/** @jest-environment node */
import type { Db } from "mongodb";

import { MongoDBClient } from "../mongodb";
import { extractHashtags, TREND_CACHE_TTL_MS, type TrendsResponse } from "../trends";
import {
  buildTrendsPipeline,
  createTrendsCache,
  ensureTrendIndexes,
  loadTrendsSnapshot,
  TREND_INDEX_NAME,
  TREND_QUERY_MAX_TIME_MS,
} from "../trendsServer";

jest.mock("../mongodb", () => ({ MongoDBClient: jest.fn() }));

const now = new Date("2026-11-02T12:00:00.000Z");
const snapshot: TrendsResponse = {
  data: [{ tag: "velo", postCount: 4, authorCount: 3 }],
  windowHours: 24,
  generatedAt: now.toISOString(),
};

function database(client = {}, databaseName = "trends") {
  const createIndex = jest.fn().mockResolvedValue(TREND_INDEX_NAME);
  const toArray = jest.fn().mockResolvedValue(snapshot.data);
  const aggregate = jest.fn().mockReturnValue({ toArray });
  const collection = jest.fn().mockReturnValue({ createIndex, aggregate });
  const db = { client, databaseName, collection } as unknown as Db;
  return { db, createIndex, collection, aggregate, toArray };
}

describe("trends aggregation invariants", () => {
  it("matches only public original posts inside an inclusive rolling 24h, excluding future posts", () => {
    expect(buildTrendsPipeline(now)[0]).toEqual({
      $match: {
        Visibility: "everyone",
        Type: "post",
        UserId: { $type: "string" },
        TimeOfPost: { $gte: "2026-11-01T12:00:00.000Z", $lte: now.toISOString() },
      },
    });
    const pipeline = JSON.stringify(buildTrendsPipeline(now));
    expect(pipeline).not.toMatch(/unionWith|lookup|Analytics|Likes|Bookmarks|Shares|Comments/);
  });

  it("uses the shared extractor grammar, safe captions, lowercasing and per-post set deduplication", () => {
    const projection = buildTrendsPipeline(now)[1].$project;
    const mapping = projection.tags.$setUnion[0].$map;
    const regex = new RegExp(mapping.input.$regexFindAll.regex, "g");
    const caption = "#Velo #velo #velo_more #café #東京";
    const extracted = [
      ...new Set(Array.from(caption.matchAll(regex), (match) => match[1].toLowerCase())),
    ];
    expect(extracted).toEqual(extractHashtags(caption));
    expect(mapping.input.$regexFindAll.input).toEqual({
      $cond: [{ $eq: [{ $type: "$Caption" }, "string"] }, "$Caption", ""],
    });
    expect(mapping.in).toEqual({ $toLower: { $arrayElemAt: ["$$token.captures", 0] } });
    expect(projection.author).toEqual({ $trim: { input: "$UserId" } });
    expect(buildTrendsPipeline(now)[2]).toEqual({ $match: { author: { $ne: "" } } });
  });

  it("counts posts once per tag and distinct nonempty authors before applying the threshold", () => {
    const pipeline = buildTrendsPipeline(now);
    expect(pipeline.slice(3, 7)).toEqual([
      { $unwind: "$tags" },
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
      { $match: { authorCount: { $gte: 3 } } },
    ]);
  });

  it("ranks authors, posts, recency, then tag deterministically and exposes only capped summary data", () => {
    const pipeline = buildTrendsPipeline(now);
    expect(pipeline.slice(7)).toEqual([
      { $sort: { authorCount: -1, postCount: -1, latestPost: -1, _id: 1 } },
      { $limit: 20 },
      { $project: { _id: 0, tag: "$_id", postCount: 1, authorCount: 1 } },
    ]);
  });

  it("loads only Posts with an indexed, bounded-time aggregation", async () => {
    const { db, collection, aggregate, toArray } = database();
    const init = jest.fn().mockResolvedValue({ getDb: async () => db });
    jest.mocked(MongoDBClient).mockImplementation(() => ({ init }) as unknown as MongoDBClient);
    const result = await loadTrendsSnapshot();
    expect(collection.mock.calls.every(([name]) => name === "Posts")).toBe(true);
    expect(aggregate).toHaveBeenCalledWith(buildTrendsPipeline(new Date(result.generatedAt)), {
      maxTimeMS: TREND_QUERY_MAX_TIME_MS,
      hint: TREND_INDEX_NAME,
      collation: { locale: "simple" },
    });
    expect(result).toEqual({ ...snapshot, generatedAt: expect.any(String) });
    expect(toArray).toHaveBeenCalledTimes(1);
  });
});

describe("trends index initialization", () => {
  it("coalesces per actual Mongo client/database, across wrapper instances", async () => {
    const first = database();
    const same = database(first.db.client);
    const pending = ensureTrendIndexes(first.db);
    expect(ensureTrendIndexes(same.db)).toBe(pending);
    await pending;
    await ensureTrendIndexes(first.db);
    expect(first.createIndex).toHaveBeenCalledTimes(1);
    expect(first.createIndex).toHaveBeenCalledWith(
      { Visibility: 1, Type: 1, TimeOfPost: -1 },
      expect.objectContaining({ name: TREND_INDEX_NAME, maxTimeMS: TREND_QUERY_MAX_TIME_MS })
    );
    expect(same.createIndex).not.toHaveBeenCalled();
    const otherDatabase = database(first.db.client, "other");
    const otherClient = database();
    await Promise.all([ensureTrendIndexes(otherDatabase.db), ensureTrendIndexes(otherClient.db)]);
    expect(otherDatabase.createIndex).toHaveBeenCalledTimes(1);
    expect(otherClient.createIndex).toHaveBeenCalledTimes(1);
  });

  it("retries failed index setup instead of retaining a rejected promise", async () => {
    const { db, createIndex } = database();
    createIndex.mockRejectedValueOnce(new Error("index unavailable"));
    await expect(ensureTrendIndexes(db)).rejects.toThrow("index unavailable");
    await ensureTrendIndexes(db);
    expect(createIndex).toHaveBeenCalledTimes(2);
  });
});

describe("process snapshot cache", () => {
  it("coalesces concurrent requests, reuses a full snapshot, and refreshes at exactly five minutes", async () => {
    let time = 0;
    const load = jest.fn().mockResolvedValue(snapshot);
    const get = createTrendsCache(load, () => time);
    const first = get();
    expect(get()).toBe(first);
    expect(await first).toBe(snapshot);
    time = TREND_CACHE_TTL_MS - 1;
    expect(await get()).toBe(snapshot);
    expect(load).toHaveBeenCalledTimes(1);
    time++;
    const refresh = get();
    expect(get()).toBe(refresh);
    await refresh;
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("coalesces failures but allows retries, including after an expired snapshot", async () => {
    let time = 0;
    const load = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(snapshot);
    const get = createTrendsCache(load, () => time);
    const failure = get();
    expect(get()).toBe(failure);
    await expect(failure).rejects.toThrow("offline");
    await expect(get()).resolves.toBe(snapshot);
    time = TREND_CACHE_TTL_MS;
    load.mockRejectedValueOnce(new Error("refresh failed"));
    await expect(get()).rejects.toThrow("refresh failed");
    await expect(get()).resolves.toBe(snapshot);
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("also clears in-flight state when the loader throws synchronously", async () => {
    const load = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("sync");
      })
      .mockResolvedValue(snapshot);
    const get = createTrendsCache(load);
    await expect(get()).rejects.toThrow("sync");
    await expect(get()).resolves.toBe(snapshot);
  });
});
