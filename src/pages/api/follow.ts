import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { FollowersSchema, MongoDBClient } from "@/lib/mongodb";
import { emitViaSocketServer } from "@/lib/socket";
import { Payload } from "@/lib/types/type";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // Extract follow action early for use in catch block
  let follow: boolean | undefined;

  try {
    // Authentication
    const cookie = decodeURIComponent(req.cookies.velo_12 || "").replace(/"/g, "");
    const payload = (await verifyToken(cookie)) as unknown as Payload;
    if (!payload) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Request validation
    const requestBody = req.body as FollowersSchema;
    const { followerId, followedId, time } = requestBody;
    follow = requestBody.follow;
    if (!followerId || !followedId || typeof follow !== "boolean") {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Authorization - ensure the authenticated user matches the followerId
    if (payload._id !== followerId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const db = await new MongoDBClient().init();
    const followers = db.followers();

    // Check existing follow status
    const isFollowing = await followers.findOne({
      followerId,
      followedId,
    });

    const projection = { _id: 1, username: 1, profilePicture: 1, followers: 1, following: 1 };
    const followerDetails = await db
      .users()
      .findOne({ _id: new ObjectId(followerId) }, { projection });

    if (follow) {
      // Idempotent follow: if already following, return success with current state
      if (isFollowing) {
        const followedDetails = await db
          .users()
          .findOne({ _id: new ObjectId(followedId) }, { projection });
        if (followedDetails) {
          followedDetails.isFollowing = true;
        }
        return res.status(200).json({
          message: "User is already following the target user",
          alreadyFollowing: true,
          followedDetails,
        });
      }

      // Follow operation with atomic upsert to prevent race conditions
      const followTime = time || new Date().toISOString();
      await Promise.all([
        followers.updateOne(
          { followerId, followedId },
          { $setOnInsert: { followerId, followedId, time: followTime } },
          { upsert: true }
        ),
        db.users().updateOne({ _id: new ObjectId(followedId) }, { $inc: { followers: 1 } }),
        db.users().updateOne({ _id: new ObjectId(followerId) }, { $inc: { following: 1 } }),
      ]);

      // Emit follow event
      const followedDetails = await db
        .users()
        .findOne({ _id: new ObjectId(followedId) }, { projection });
      followedDetails!.isFollowing = true;
      try {
        await emitViaSocketServer(followerId, "follow", {
          followedDetails,
          followerDetails,
          time: time || new Date().toISOString(),
          /** Explicit flag so clients never rely on nested booleans that can drop across the wire */
          following: true,
        });
      } catch (e) {
        console.error("[api/follow] socket follow notify failed:", e);
      }

      return res.status(200).json({
        message: "User is now following the target user",
      });
    } else {
      // Idempotent unfollow: if not following, return success with current state
      if (!isFollowing) {
        const followedDetails = await db
          .users()
          .findOne({ _id: new ObjectId(followedId) }, { projection });
        if (followedDetails) {
          followedDetails.isFollowing = false;
        }
        return res.status(200).json({
          message: "User is not following the target user",
          notFollowing: true,
          followedDetails,
        });
      }

      // Unfollow operation
      const deleteResult = await followers.deleteOne({
        followerId,
        followedId,
      });

      // Only decrement counters if we actually deleted a follow relationship
      if (deleteResult.deletedCount > 0) {
        await Promise.all([
          db.users().updateOne({ _id: new ObjectId(followedId) }, { $inc: { followers: -1 } }),
          db.users().updateOne({ _id: new ObjectId(followerId) }, { $inc: { following: -1 } }),
        ]);
      }

      // Emit unfollow event
      const followedDetails = await db
        .users()
        .findOne({ _id: new ObjectId(followedId) }, { projection });
      followedDetails!.isFollowing = false;
      try {
        await emitViaSocketServer(followerId, "unfollow", {
          followedDetails,
          followerDetails,
          time: time || new Date().toISOString(),
          following: false,
        });
      } catch (e) {
        console.error("[api/follow] socket unfollow notify failed:", e);
      }

      return res.status(200).json({
        message: "User has now unfollowed the target user",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    
    // Handle MongoDB duplicate key error (code 11000)
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      // This shouldn't happen with our upsert logic, but handle it gracefully
      return res.status(200).json({
        message: follow
          ? "User is already following the target user"
          : "User is not following the target user",
        alreadyProcessed: true,
      });
    }
    
    return res.status(500).json({
      message: "Internal Server Error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
