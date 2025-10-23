import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { Payload } from "@/lib/types/type";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : "").replace(
        /"/g,
        ""
      );
      const payload = (await verifyToken(cookie)) as unknown as Payload;

      if (!req.query.id) return res.status(400).json({ error: `Post ID is required` });
      const id = req.query.id;

      const db = await new MongoDBClient().init();
      // console.log('Connected to post.app ' + id);
      const post = await searchPostFromMultipleCollections(db, `${id}`);
      // console.log(post);

      if (post) {
        const user = payload ? await db.users().findOne({ _id: new ObjectId(payload._id) }) : null;

        if (user) {
          const collectionsMap = {
            Likes: "Liked",
            Shares: "Shared",
            Bookmarks: "Bookmarked",
            IsFollowing: "IsFollowing",
          };

          await Promise.all(
            Object.entries(collectionsMap).map(async ([collectionName, field]) => {
              const collection =
                post.UserId === user._id.toString() && collectionName === "IsFollowing"
                  ? null
                  : collectionName === "IsFollowing"
                    ? db.followers()
                    : (db as any)[`posts${collectionName}`]();

              if (!collection) return;
              const result = await (async () => {
                if (collectionName === "IsFollowing") {
                  return collection.findOne({
                    followerId: user._id.toString(),
                    followedId: post.UserId,
                  });
                }
                if (collectionName === "Shares") {
                  return collection.findOne({
                    OriginalPostId: post.PostID,
                    UserId: user._id.toString(),
                  });
                }
                return collection.findOne({ postId: post.PostID, userId: user._id.toString() });
              })();
              if (result) {
                (post as any)[field] = true;
              }
            })
          );

          return res.status(200).json({ post });
        } else {
          return res.status(200).json({ post, message: "Disable Comment." });
        }
      }
      return res
        .status(400)
        .json({ error: "Oops! Post not found. You can search for other things." });
    } catch (err) {
      console.error("Error: ", err);
      res.status(500).json({ error: err });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}

async function searchPostFromMultipleCollections(db: MongoDBClient, id: string) {
  // Fetch posts from the 'Posts' collection
  const post = await db.posts().findOne({ PostID: id });
  if (post) return post;

  // Fetch posts from the 'Posts_Comments' collection
  const comment = await db.postsComments().findOne({ PostID: id });
  if (comment) return comment;

  // Fetch posts from the 'Posts_Shares' collection
  const share = await db.postsShares().findOne({ PostID: id });
  if (share) return share;

  return null;
}
