import { createHmac } from "node:crypto";

import type { Collection, Db } from "mongodb";
import type { NextApiRequest } from "next";

import type { MongoDBClient } from "./mongodb";

export const ANALYTICS_RATE_LIMIT = 120;
const indexes = new WeakMap<object, Map<string, Promise<void>>>();
type RateBucket = { _id: string; count: number; expiresAt: Date };

export function isDuplicateAnalyticsError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

/** Missing Origin is permitted only with the browser's explicit same-origin fetch metadata. */
export function isSameOriginAnalyticsRequest(req: NextApiRequest): boolean {
  if (req.headers["sec-fetch-site"] && req.headers["sec-fetch-site"] !== "same-origin")
    return false;
  const origin = req.headers.origin;
  if (!origin) return req.headers["sec-fetch-site"] === "same-origin";
  if (typeof origin !== "string" || !req.headers.host) return false;
  try {
    const expected = process.env.POST_ANALYTICS_ORIGIN || process.env.NEXTAUTH_URL;
    const encrypted = (req.socket as typeof req.socket & { encrypted?: boolean }).encrypted;
    const protocol = req.headers["x-forwarded-proto"] || (encrypted ? "https" : "http");
    if (protocol !== "http" && protocol !== "https") return false;
    return (
      new URL(origin).origin === new URL(expected || `${protocol}://${req.headers.host}`).origin
    );
  } catch {
    return false;
  }
}

/** Neither addresses nor raw request headers are stored; daily buckets expire automatically. */
export function postAnalyticsRateKey(
  req: NextApiRequest,
  userId: string | undefined,
  now: Date
): string {
  const secret = process.env.POST_ANALYTICS_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("Analytics rate limiting requires a server secret");
  // Only trust forwarded addresses on Vercel, which overwrites this header.
  const forwarded = process.env.VERCEL === "1" ? req.headers["x-forwarded-for"] : undefined;
  const address =
    typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress;
  const identity = userId ? `user:${userId}` : `network:${address || "unknown"}`;
  return createHmac("sha256", secret)
    .update(`${now.toISOString().slice(0, 10)}:${identity}`)
    .digest("hex");
}

export async function ensurePostAnalyticsIndexes(db: Db): Promise<void> {
  // MongoClient.db() returns a fresh wrapper on each request; cache by client + database.
  let databases = indexes.get(db.client);
  if (!databases) {
    databases = new Map();
    indexes.set(db.client, databases);
  }
  const cache = databases;
  let pending = cache.get(db.databaseName);
  if (!pending) {
    pending = (async () => {
      await db.collection("Post_Analytics").createIndexes([
        {
          key: { schemaVersion: 1, eventId: 1 },
          name: "analytics_v2_event_unique",
          unique: true,
          partialFilterExpression: { schemaVersion: 2 },
        },
        {
          key: { schemaVersion: 1, sessionId: 1, postId: 1, eventKey: 1 },
          name: "analytics_v2_session_milestone_unique",
          unique: true,
          partialFilterExpression: { schemaVersion: 2 },
        },
      ]);
      await db
        .collection("Post_Analytics_RateLimits")
        .createIndex({ expiresAt: 1 }, { name: "analytics_rate_expiry", expireAfterSeconds: 0 });
    })();
    cache.set(db.databaseName, pending);
    pending.catch(() => cache.delete(db.databaseName));
  }
  await pending;
}

/** Atomic, cross-instance fixed window; count cannot grow beyond the limit. */
export async function consumePostAnalyticsRate(
  collection: Collection<RateBucket>,
  key: string,
  now: Date
): Promise<boolean> {
  const minute = Math.floor(now.getTime() / 60_000);
  try {
    const bucket = await collection.findOneAndUpdate(
      { _id: `${key}:${minute}`, count: { $lt: ANALYTICS_RATE_LIMIT } },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((minute + 2) * 60_000) } },
      { upsert: true, returnDocument: "after" }
    );
    return bucket !== null && bucket.count <= ANALYTICS_RATE_LIMIT;
  } catch (error) {
    // A full bucket no longer matches; upsert hits the built-in unique _id index.
    if (isDuplicateAnalyticsError(error)) return false;
    throw error;
  }
}

export async function canReadAnalyticsPost(
  db: MongoDBClient,
  post: { Visibility?: unknown; UserId?: unknown },
  userId?: string
): Promise<boolean> {
  if (!["everyone", "friends", "none"].includes(post.Visibility as string)) return false;
  if (post.Visibility === "everyone") return true;
  if (!userId || typeof post.UserId !== "string" || !post.UserId) return false;
  if (post.UserId === userId) return true;
  if (post.Visibility !== "friends") return false;
  const active = { $or: [{ follow: { $exists: false } }, { follow: true as const }] };
  const [outgoing, incoming] = await Promise.all([
    db.followers().findOne({ followerId: userId, followedId: post.UserId, ...active }),
    db.followers().findOne({ followerId: post.UserId, followedId: userId, ...active }),
  ]);
  return Boolean(outgoing && incoming);
}
