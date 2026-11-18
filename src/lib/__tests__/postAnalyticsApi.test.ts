/** @jest-environment node */
import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import handle from "@/pages/api/analytics/track";

jest.mock("@/lib/auth", () => ({ verifyToken: jest.fn() }));
jest.mock("@/lib/mongodb", () => ({ MongoDBClient: jest.fn() }));

const userId = "111111111111111111111111";
const ownerId = "222222222222222222222222";
const validBody = () => ({
  schemaVersion: 2,
  postId: "post-one",
  eventId: "11111111-1111-4111-8111-111111111111",
  sessionId: "22222222-2222-4222-8222-222222222222",
  event: "view",
  metadata: { activeMs: 1000, continuousVisibleMs: 1000 },
});
let posts: { findOne: jest.Mock };
let comments: { findOne: jest.Mock };
let shares: { findOne: jest.Mock };
let followers: { findOne: jest.Mock };
let analytics: { insertOne: jest.Mock; createIndexes: jest.Mock };
let rates: { findOneAndUpdate: jest.Mock; createIndex: jest.Mock };
let init: jest.Mock;

function request(overrides: Partial<NextApiRequest> = {}) {
  return {
    method: "POST",
    body: validBody(),
    cookies: {},
    headers: {
      host: "velo.test",
      origin: "http://velo.test",
      "content-type": "application/json",
      referer: "http://velo.test/private?secret=unnecessary",
      "user-agent": "do-not-store",
    },
    socket: { remoteAddress: "127.0.0.1" },
    ...overrides,
  } as NextApiRequest;
}
function response() {
  const res = { status: jest.fn(), json: jest.fn(), setHeader: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as NextApiResponse & typeof res;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.POST_ANALYTICS_SECRET = "test-secret";
  process.env.POST_ANALYTICS_ORIGIN = "http://velo.test";
  posts = { findOne: jest.fn().mockResolvedValue({ Visibility: "everyone", UserId: ownerId }) };
  comments = { findOne: jest.fn().mockResolvedValue(null) };
  shares = { findOne: jest.fn().mockResolvedValue(null) };
  followers = { findOne: jest.fn().mockResolvedValue(null) };
  analytics = {
    insertOne: jest.fn().mockResolvedValue({}),
    createIndexes: jest.fn().mockResolvedValue([]),
  };
  rates = {
    findOneAndUpdate: jest.fn().mockResolvedValue({ count: 1 }),
    createIndex: jest.fn().mockResolvedValue(""),
  };
  const mongo = {
    client: {},
    databaseName: "analytics",
    collection: (name: string) => (name === "Post_Analytics" ? analytics : rates),
  };
  const db = {
    init: jest.fn(),
    getDb: async () => mongo,
    posts: () => posts,
    postsComments: () => comments,
    postsShares: () => shares,
    followers: () => followers,
    postsAnalytics: () => analytics,
  };
  init = db.init.mockResolvedValue(db);
  jest.mocked(MongoDBClient).mockImplementation(() => db as unknown as MongoDBClient);
  jest.mocked(verifyToken).mockResolvedValue({ _id: userId });
});
afterEach(() => {
  delete process.env.POST_ANALYTICS_SECRET;
  delete process.env.POST_ANALYTICS_ORIGIN;
});

describe("POST /api/analytics/track", () => {
  it("stores anonymous v2 events without identity, IP, UA, referrer, or raw historical schema", async () => {
    const res = response();
    await handle(request(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(analytics.insertOne).toHaveBeenCalledWith({
      ...validBody(),
      eventKey: "view",
      createdAt: expect.any(String),
    });
    expect(verifyToken).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it("uses only verified server identity", async () => {
    await handle(request({ cookies: { velo_12: "token" } }), response());
    expect(verifyToken).toHaveBeenCalledWith("token");
    expect(analytics.insertOne).toHaveBeenCalledWith(expect.objectContaining({ userId }));
    const res = response();
    await handle(request({ body: { ...validBody(), userId: ownerId } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(analytics.insertOne).toHaveBeenCalledTimes(1);
  });

  it.each(["%malformed", "token"])(
    "rejects invalid auth without treating the request as anonymous (%s)",
    async (cookie) => {
      jest.mocked(verifyToken).mockResolvedValue(null);
      const res = response();
      await handle(request({ cookies: { velo_12: cookie } }), res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(init).not.toHaveBeenCalled();
    }
  );

  it("rejects cross-origin, legacy, unbounded, or non-JSON input before database work", async () => {
    const cases = [
      request({
        headers: {
          host: "velo.test",
          origin: "http://other.test",
          "content-type": "application/json",
        },
      }),
      request({ body: { postId: "post-one", event: "view" } }),
      request({ body: { ...validBody(), event: "scroll" } }),
      request({ body: { ...validBody(), metadata: { activeMs: 1e12 } } }),
      request({
        headers: { host: "velo.test", origin: "http://velo.test", "content-type": "text/plain" },
      }),
    ];
    for (const [index, req] of cases.entries()) {
      const res = response();
      await handle(req, res);
      expect(res.status).toHaveBeenCalledWith([403, 400, 400, 400, 415][index]);
    }
    expect(init).not.toHaveBeenCalled();
  });

  it("returns 405 and Allow for unsupported methods", async () => {
    const res = response();
    await handle(request({ method: "GET" }), res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith("Allow", "POST");
    expect(init).not.toHaveBeenCalled();
  });

  it("denies missing, private, unknown and one-way friends posts; permits owners and mutual friends", async () => {
    for (const post of [
      null,
      { Visibility: "none", UserId: ownerId },
      { Visibility: "unknown", UserId: userId },
      { Visibility: "friends", UserId: ownerId },
    ]) {
      posts.findOne.mockResolvedValue(post);
      const res = response();
      await handle(request({ cookies: { velo_12: "token" } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    }
    expect(analytics.insertOne).not.toHaveBeenCalled();
    posts.findOne.mockResolvedValue({ Visibility: "none", UserId: userId });
    const owner = response();
    await handle(request({ cookies: { velo_12: "token" } }), owner);
    expect(owner.status).toHaveBeenCalledWith(200);
    posts.findOne.mockResolvedValue({ Visibility: "friends", UserId: ownerId });
    followers.findOne.mockResolvedValue({});
    const mutual = response();
    await handle(request({ cookies: { velo_12: "token" } }), mutual);
    expect(mutual.status).toHaveBeenCalledWith(200);
  });

  it.each(["comment", "share"])(
    "applies access checks to fallback %s collections",
    async (kind) => {
      posts.findOne.mockResolvedValue(null);
      const source = kind === "comment" ? comments : shares;
      source.findOne.mockResolvedValue({ Visibility: "none", UserId: ownerId });
      const res = response();
      await handle(request(), res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(analytics.insertOne).not.toHaveBeenCalled();
    }
  );

  it("acknowledges duplicate event/milestone keys idempotently", async () => {
    analytics.insertOne.mockRejectedValue({ code: 11000 });
    const res = response();
    await handle(request(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, duplicate: true });
    expect(analytics.createIndexes).toHaveBeenCalled();
  });

  it("rate limits across session rotations before post reads", async () => {
    rates.findOneAndUpdate.mockRejectedValue({ code: 11000 });
    for (let i = 0; i < 2; i++) {
      const res = response();
      const body = validBody();
      body.sessionId = `${i + 3}2222222-2222-4222-8222-222222222222`;
      await handle(request({ body }), res);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "60");
    }
    expect(rates.findOneAndUpdate.mock.calls[0][0]._id).toBe(
      rates.findOneAndUpdate.mock.calls[1][0]._id
    );
    expect(posts.findOne).not.toHaveBeenCalled();
    expect(analytics.insertOne).not.toHaveBeenCalled();
  });

  it("fails closed if indexes/access/rate storage are unavailable", async () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    analytics.createIndexes.mockRejectedValue(new Error("denied"));
    const res = response();
    await handle(request(), res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(analytics.insertOne).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
