import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { parsePostAnalyticsEvent, postAnalyticsEventKey } from "@/lib/postAnalytics";
import {
  canReadAnalyticsPost,
  consumePostAnalyticsRate,
  ensurePostAnalyticsIndexes,
  isDuplicateAnalyticsError,
  isSameOriginAnalyticsRequest,
  postAnalyticsRateKey,
} from "@/lib/postAnalyticsServer";

export const config = { api: { bodyParser: { sizeLimit: "4kb" } } };

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  if (!isSameOriginAnalyticsRequest(req)) {
    return res.status(403).json({ error: "Same-origin requests required" });
  }
  if (req.headers["content-type"]?.split(";")[0].trim() !== "application/json") {
    return res.status(415).json({ error: "JSON required" });
  }
  const event = parsePostAnalyticsEvent(req.body);
  if (!event) return res.status(400).json({ error: "Invalid analytics event" });

  try {
    let userId: string | undefined;
    const cookie = req.cookies.velo_12;
    if (cookie) {
      let token: string;
      try {
        token = decodeURIComponent(cookie).replace(/"/g, "");
      } catch {
        return res.status(401).json({ error: "Invalid session" });
      }
      const payload = await verifyToken(token);
      if (!payload || typeof payload._id !== "string" || !/^[a-f0-9]{24}$/i.test(payload._id)) {
        return res.status(401).json({ error: "Invalid session" });
      }
      userId = payload._id;
    }

    const now = new Date();
    const rateKey = postAnalyticsRateKey(req, userId, now);
    const db = await new MongoDBClient().init();
    const mongo = await db.getDb();
    await ensurePostAnalyticsIndexes(mongo);
    const permitted = await consumePostAnalyticsRate(
      mongo.collection("Post_Analytics_RateLimits"),
      rateKey,
      now
    );
    if (!permitted) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({ error: "Analytics rate limit exceeded" });
    }

    const post =
      (await db.posts().findOne({ PostID: event.postId })) ||
      (await db.postsComments().findOne({ PostID: event.postId })) ||
      (await db.postsShares().findOne({ PostID: event.postId }));
    // Use the same response for missing and inaccessible posts.
    if (!post || !(await canReadAnalyticsPost(db, post, userId))) {
      return res.status(404).json({ error: "Post not found" });
    }

    try {
      await db.postsAnalytics().insertOne({
        ...event,
        ...(userId ? { userId } : {}),
        eventKey: postAnalyticsEventKey(event),
        createdAt: now.toISOString(),
      });
    } catch (error) {
      if (!isDuplicateAnalyticsError(error)) throw error;
      return res.status(200).json({ success: true, duplicate: true });
    }
    return res.status(200).json({ success: true });
  } catch {
    // Do not log request payloads, cookies, IPs, or browser headers.
    console.error("Post analytics unavailable");
    return res.status(503).json({ error: "Analytics temporarily unavailable" });
  }
}
