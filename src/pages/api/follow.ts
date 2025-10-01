import { verifyToken } from "@/lib/auth";
import { FollowersSchema, MongoDBClient } from "@/lib/mongodb";
import { getSocketInstance } from "@/lib/socket";
import { Payload } from "@/lib/types/type";
import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // Authentication
    const cookie = decodeURIComponent(req.cookies.velo_12 || "").replace(/"/g, "");
    const payload = (await verifyToken(cookie)) as unknown as Payload;
    if (!payload) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Request validation
    const { followerId, followedId, time, follow } = req.body as FollowersSchema;
    if (!followerId || !followedId || typeof follow !== "boolean") {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Authorization - ensure the authenticated user matches the followerId
    if (payload._id !== followerId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Initialize socket with the followerId
    const socket = getSocketInstance(followerId);

    const db = await new MongoDBClient().init();
    const followers = db.followers();

    // Check existing follow status
    const isFollowing = await followers.findOne({
      followerId: followerId,
      followedId: followedId,
    });

    const projection = { _id: 1, username: 1, profilePicture: 1, followers: 1, following: 1 };
    const followerDetails = await db
      .users()
      .findOne({ _id: new ObjectId(followerId) }, { projection });

    if (follow) {
      if (isFollowing) {
        return res.status(409).json({ message: "User is already following the target user" });
      }

      // Follow operation
      await Promise.all([
        followers.insertOne({
          followerId,
          followedId,
          time: time || new Date().toISOString(),
        }),
        db.users().updateOne({ _id: new ObjectId(followedId) }, { $inc: { followers: 1 } }),
        db.users().updateOne({ _id: new ObjectId(followerId) }, { $inc: { following: 1 } }),
      ]);

      // Emit follow event
      const followedDetails = await db
        .users()
        .findOne({ _id: new ObjectId(followedId) }, { projection });
      followedDetails!.isFollowing = true;
      socket.emit("follow", {
        followedDetails,
        followerDetails,
        time: time || new Date().toISOString(),
      });

      return res.status(200).json({
        message: "User is now following the target user",
      });
    } else {
      if (!isFollowing) {
        return res.status(400).json({
          message: "User is not following the target user",
        });
      }

      // Unfollow operation
      await Promise.all([
        db.users().updateOne({ _id: new ObjectId(followedId) }, { $inc: { followers: -1 } }),
        followers.deleteOne({
          followerId: followerId,
          followedId: followedId,
        }),
        db.users().updateOne({ _id: new ObjectId(followerId) }, { $inc: { following: -1 } }),
      ]);

      // Emit unfollow event
      const followedDetails = await db
        .users()
        .findOne({ _id: new ObjectId(followedId) }, { projection });
      followedDetails!.isFollowing = false;
      socket.emit("unfollow", {
        followedDetails,
        followerDetails,
        time: time || new Date().toISOString(),
      });

      return res.status(200).json({
        message: "User has now unfollowed the target user",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
