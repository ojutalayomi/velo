import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { Payload } from "@/lib/types/type";

export interface PostAnalytics {
  _id?: ObjectId;
  postId: string;
  userId?: string;
  event: "view" | "scroll" | "time" | "engagement";
  metadata?: {
    scrollDepth?: number;
    timeOnPage?: number;
    referrer?: string;
    userAgent?: string;
    timestamp?: string;
  };
  createdAt: string;
}

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : "").replace(
      /"/g,
      ""
    );
    const payload = cookie ? (await verifyToken(cookie)) as unknown as Payload : null;

    const { postId, event, metadata } = req.body;

    if (!postId || !event) {
      return res.status(400).json({ error: "Post ID and event are required" });
    }

    const db = await new MongoDBClient().init();
    
    // Verify post exists
    const post = await db.posts().findOne({ PostID: postId });
    if (!post) {
      // Check other collections
      const comment = await db.postsComments().findOne({ PostID: postId });
      const share = await db.postsShares().findOne({ PostID: postId });
      
      if (!comment && !share) {
        return res.status(404).json({ error: "Post not found" });
      }
    }

    // Create analytics entry
    const analyticsEntry: PostAnalytics = {
      postId,
      userId: payload?._id || undefined,
      event,
      metadata: {
        ...metadata,
        referrer: req.headers.referer,
        userAgent: req.headers["user-agent"],
        timestamp: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    };

    // Store analytics in database
    const analyticsCollection = (await db.getDb()).collection<PostAnalytics>("Post_Analytics");
    await analyticsCollection.insertOne(analyticsEntry);

    // For view events, update post view count (optional - can be done via aggregation)
    if (event === "view") {
      // You could increment a view count field here if needed
      // For now, we'll just track it in analytics
    }

    return res.status(200).json({ success: true, analytics: analyticsEntry });
  } catch (error) {
    console.error("Error tracking analytics:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

