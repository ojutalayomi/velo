import type { NextApiRequest, NextApiResponse } from "next";

import { addInteractionFlags } from "@/lib/apiUtils";
import { pagingMeta, parsePaging } from "@/lib/apiPagination";
import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import type { Payload, PostSchema } from "@/lib/types/type";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const rawCookie = req.cookies.velo_12;
    const cookie = rawCookie?.replace(/^"|"$/g, "");
    const payload = cookie
      ? ((await verifyToken(cookie).catch(() => null)) as unknown as Payload | null)
      : null;

    const { limit: pageLimit, skip } = parsePaging(req);
    const db = await new MongoDBClient().init();

    const { posts, hasMore } = await fetchExplorePosts(db, skip, pageLimit);

    if (payload?._id) {
      await addInteractionFlags(db, posts as any, payload._id);
    }

    return res.json({
      data: posts,
      pagination: pagingMeta(skip, pageLimit, hasMore),
    });
  } catch (error) {
    console.error("Error fetching explore posts:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function fetchExplorePosts(db: MongoDBClient, skip: number, limit: number) {
  const fetchLimit = limit + 1;

  const cursor = db.posts().aggregate([
    {
      $unionWith: {
        coll: "Posts_Shares",
        pipeline: [],
      },
    },
    // Only posts that have at least one media item
    { $match: { "Image.0": { $exists: true } } },
    { $sort: { TimeOfPost: -1 } },
    { $skip: skip },
    { $limit: fetchLimit },
  ]);

  const batch = await cursor.toArray();
  const hasMore = batch.length > limit;
  const posts = batch.slice(0, limit) as unknown as PostSchema[];

  return { posts, hasMore };
}
