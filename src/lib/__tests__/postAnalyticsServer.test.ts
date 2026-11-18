/** @jest-environment node */
import type { Db } from "mongodb";
import type { NextApiRequest } from "next";

import type { MongoDBClient } from "../mongodb";
import {
  ANALYTICS_RATE_LIMIT,
  canReadAnalyticsPost,
  consumePostAnalyticsRate,
  ensurePostAnalyticsIndexes,
  isSameOriginAnalyticsRequest,
  postAnalyticsRateKey,
} from "../postAnalyticsServer";

function request(headers: Record<string, string | undefined> = {}) {
  return {
    headers: { host: "velo.test", ...headers },
    socket: { remoteAddress: "127.0.0.1" },
  } as NextApiRequest;
}

beforeEach(() => {
  delete process.env.POST_ANALYTICS_ORIGIN;
  delete process.env.NEXTAUTH_URL;
});

describe("analytics same-origin boundary", () => {
  it("rejects cross-origin, same-site, null and unidentifiable origins", () => {
    for (const headers of [
      { origin: "https://attacker.test" },
      { origin: "null" },
      {},
      { origin: "http://velo.test", "sec-fetch-site": "same-site" },
      { origin: "http://velo.test", "sec-fetch-site": "cross-site" },
    ])
      expect(isSameOriginAnalyticsRequest(request(headers))).toBe(false);
  });
  it("accepts same-origin fetch/beacon and respects a configured canonical origin", () => {
    expect(isSameOriginAnalyticsRequest(request({ origin: "http://velo.test" }))).toBe(true);
    expect(isSameOriginAnalyticsRequest(request({ "sec-fetch-site": "same-origin" }))).toBe(true);
    process.env.POST_ANALYTICS_ORIGIN = "https://velo.test";
    expect(isSameOriginAnalyticsRequest(request({ origin: "http://velo.test" }))).toBe(false);
    expect(isSameOriginAnalyticsRequest(request({ origin: "https://velo.test" }))).toBe(true);
  });
});

describe("analytics visibility access", () => {
  const findOne = jest.fn();
  const db = { followers: () => ({ findOne }) } as unknown as MongoDBClient;
  beforeEach(() => findOne.mockReset());
  it("allows public for anyone and private for only the owner", async () => {
    expect(await canReadAnalyticsPost(db, { Visibility: "everyone" })).toBe(true);
    expect(await canReadAnalyticsPost(db, { Visibility: "none", UserId: "owner" }, "owner")).toBe(
      true
    );
    expect(await canReadAnalyticsPost(db, { Visibility: "none", UserId: "owner" }, "other")).toBe(
      false
    );
    expect(await canReadAnalyticsPost(db, { Visibility: "none", UserId: "owner" })).toBe(false);
    expect(findOne).not.toHaveBeenCalled();
  });
  it.each([undefined, null, "public", "unknown", {}, 1])(
    "fails closed on unknown visibility %p even for owners",
    async (Visibility) => {
      expect(await canReadAnalyticsPost(db, { Visibility, UserId: "owner" }, "owner")).toBe(false);
    }
  );
  it("requires both active directions for friends, never one-way or anonymous", async () => {
    const post = { Visibility: "friends", UserId: "owner" };
    expect(await canReadAnalyticsPost(db, post)).toBe(false);
    findOne.mockResolvedValueOnce({}).mockResolvedValueOnce(null);
    expect(await canReadAnalyticsPost(db, post, "viewer")).toBe(false);
    findOne.mockResolvedValue({});
    expect(await canReadAnalyticsPost(db, post, "viewer")).toBe(true);
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ followerId: "owner", followedId: "viewer" })
    );
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ followerId: "viewer", followedId: "owner" })
    );
    expect(findOne.mock.calls[0][0].$or).toEqual([
      { follow: { $exists: false } },
      { follow: true },
    ]);
  });
  it("does not turn database failures into permission", async () => {
    findOne.mockRejectedValue(new Error("unavailable"));
    await expect(
      canReadAnalyticsPost(db, { Visibility: "friends", UserId: "owner" }, "viewer")
    ).rejects.toThrow();
  });
});

describe("MongoDB analytics invariants", () => {
  it("creates unique indexes only for v2 without migrating/deleting historical events", async () => {
    const analytics = { createIndexes: jest.fn().mockResolvedValue([]) };
    const rate = { createIndex: jest.fn().mockResolvedValue("ttl") };
    const wrapper = {
      client: {},
      databaseName: "analytics",
      collection: jest.fn((name: string) => (name === "Post_Analytics" ? analytics : rate)),
    };
    const db = wrapper as unknown as Db;
    const secondWrapper = { ...wrapper } as unknown as Db;
    await Promise.all([ensurePostAnalyticsIndexes(db), ensurePostAnalyticsIndexes(secondWrapper)]);
    expect(analytics.createIndexes).toHaveBeenCalledTimes(1);
    const definitions = analytics.createIndexes.mock.calls[0][0];
    expect(definitions).toHaveLength(2);
    expect(
      definitions.every(
        (definition: { unique: boolean; partialFilterExpression: object }) =>
          definition.unique &&
          JSON.stringify(definition.partialFilterExpression) === '{"schemaVersion":2}'
      )
    ).toBe(true);
    expect(rate.createIndex).toHaveBeenCalledWith(
      { expiresAt: 1 },
      expect.objectContaining({ expireAfterSeconds: 0 })
    );
  });

  it("uses atomic bounded buckets and denies duplicate-key races at capacity", async () => {
    const findOneAndUpdate = jest.fn().mockResolvedValue({ count: ANALYTICS_RATE_LIMIT });
    const collection = { findOneAndUpdate } as unknown as Parameters<
      typeof consumePostAnalyticsRate
    >[0];
    const now = new Date("2026-11-02T10:00:10Z");
    expect(await consumePostAnalyticsRate(collection, "hashed", now)).toBe(true);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: `hashed:${Math.floor(now.getTime() / 60_000)}`, count: { $lt: ANALYTICS_RATE_LIMIT } },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date("2026-11-02T10:02:00Z") } },
      { upsert: true, returnDocument: "after" }
    );
    findOneAndUpdate.mockRejectedValue({ code: 11000 });
    expect(await consumePostAnalyticsRate(collection, "hashed", now)).toBe(false);
    findOneAndUpdate.mockRejectedValue(new Error("offline"));
    await expect(consumePostAnalyticsRate(collection, "hashed", now)).rejects.toThrow("offline");
  });

  it("hashes network identity daily, ignores spoofed proxy headers off Vercel, and does not key by client session", () => {
    process.env.POST_ANALYTICS_SECRET = "test-only-secret";
    const previousVercel = process.env.VERCEL;
    delete process.env.VERCEL;
    try {
      const req = request({ "x-forwarded-for": "spoofed" });
      const today = new Date("2026-11-02T10:00:00Z");
      const key = postAnalyticsRateKey(req, undefined, today);
      expect(key).toMatch(/^[a-f0-9]{64}$/);
      expect(key).toBe(postAnalyticsRateKey(request(), undefined, today));
      expect(key).not.toBe(postAnalyticsRateKey(req, "server-user", today));
      expect(key).not.toBe(postAnalyticsRateKey(req, undefined, new Date("2026-11-03T10:00:00Z")));
    } finally {
      if (previousVercel !== undefined) process.env.VERCEL = previousVercel;
      delete process.env.POST_ANALYTICS_SECRET;
    }
  });
});
