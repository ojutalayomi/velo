import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { Payload } from "@/lib/types/type";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { username } = req.query;

    try {
      const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : "").replace(
        /"/g,
        ""
      );
      let payload: Payload | null = null;
      if (cookie !== "" && cookie !== undefined) {
        payload = (await verifyToken(cookie)) as unknown as Payload;
      }
      const db = await new MongoDBClient().init();
      const users = db.users();
      const followers = db.followers();

      // Find user
      const user = await users.findOne(
        { username },
        {
          projection: {
            password: 0,
            confirmationToken: 0,
            resetToken: 0,
            resetTokenExpiry: 0,
            loginToken: 0,
            lastResetAttempt: 0
          },
        }
      );
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (payload) {
        if (user?._id.toString() !== payload._id) {
          const isFollowing = await followers.findOne({
            followerId: (payload as unknown as Payload)._id,
            followedId: user?._id.toString(),
          });
          if (isFollowing) {
            user.isFollowing = true;
          }
        }
      }

      // The number of posts the user has made: their own posts and quote posts, but not
      // comments or plain reposts, and not ones an admin hid. Counted here so the profile
      // doesn't have to guess it from however many posts happen to be loaded.
      const authorId = user._id.toString();
      const [ownPosts, quotePosts] = await Promise.all([
        db.posts().countDocuments({ UserId: authorId, Type: "post", hidden: { $ne: true } }),
        db.postsShares().countDocuments({ UserId: authorId, Type: "quote", hidden: { $ne: true } }),
      ]);
      const postCount = ownPosts + quotePosts;

      return res.status(200).json({ ...user, postCount });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
    // Remove the client.close() from finally block
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
