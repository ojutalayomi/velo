import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { pagingMeta, parsePaging } from "@/lib/apiPagination";
import { MongoDBClient } from "@/lib/mongodb";
import type { Payload, PostSchema } from "@/lib/types/type";

import { addInteractionFlags } from "../../lib/apiUtils";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const rawCookie = req.cookies.velo_12;
    const cookie = rawCookie?.replace(/^"|"$/g, "");
    const payload = cookie ? ((await verifyToken(cookie)) as unknown as Payload) : null;

    const { limit: pageLimit, skip } = parsePaging(req);

    const db = await new MongoDBClient().init();
    const user = payload?._id ? await db.users().findOne({ _id: new ObjectId(payload._id) }) : null;

    const { posts: pagePosts, hasMore } = await fetchPostsPage(db, skip, pageLimit);

    if (user) {
      await addInteractionFlags(db, pagePosts, user._id.toString());
    }

    return res.json({
      data: pagePosts,
      pagination: pagingMeta(skip, pageLimit, hasMore),
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function fetchPostsPage(db: MongoDBClient, skip: number, limit: number) {
  const fetchLimit = limit + 1;

  const cursor = db.posts().aggregate([
    {
      $unionWith: {
        coll: "Posts_Shares",
        pipeline: [],
      },
    },
    { $sort: { TimeOfPost: -1 } },
    { $skip: skip },
    { $limit: fetchLimit },
  ]);

  const batch = await cursor.toArray();
  const hasMore = batch.length > limit;
  const posts = batch.slice(0, limit) as unknown as PostSchema[];

  return { posts, hasMore };
}
