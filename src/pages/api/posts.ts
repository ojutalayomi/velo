import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { pagingMeta, parsePaging } from "@/lib/apiPagination";
import { verifyToken } from "@/lib/auth";
import { buildRankingStages } from "@/lib/feedRanking";
import { getFollowedIds } from "@/lib/followedIds";
import { MongoDBClient } from "@/lib/mongodb";
import { withAuthors } from "@/lib/postAuthors";
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

    // `?sort=latest` keeps the old newest-first order; default is the ranked "For you" feed.
    const latest = req.query.sort === "latest";
    const followedIds = !latest && user ? await getFollowedIds(db, user._id.toString()) : [];

    const { posts: pagePosts, hasMore } = await fetchPostsPage(db, skip, pageLimit, {
      ranked: !latest,
      followedIds,
    });

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

async function fetchPostsPage(
  db: MongoDBClient,
  skip: number,
  limit: number,
  opts: { ranked: boolean; followedIds: string[] }
) {
  const fetchLimit = limit + 1;

  const cursor = db.posts().aggregate([
    {
      $unionWith: {
        coll: "Posts_Shares",
        pipeline: [],
      },
    },
    { $match: { hidden: { $ne: true } } }, // hidden by an admin
    ...(opts.ranked
      ? buildRankingStages("forYou", { followedIds: opts.followedIds })
      : [{ $sort: { TimeOfPost: -1 } }]),
    { $skip: skip },
    { $limit: fetchLimit },
  ]);

  const batch = await cursor.toArray();
  const hasMore = batch.length > limit;
  const posts = await withAuthors(db, batch.slice(0, limit) as unknown as PostSchema[]);

  return { posts, hasMore };
}
