import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { pagingMeta, parsePaging } from "@/lib/apiPagination";
import { buildRankingStages } from "@/lib/feedRanking";
import { getHiddenAuthorIds } from "@/lib/hiddenAuthors";
import { MongoDBClient, FollowersSchema } from "@/lib/mongodb";
import { withAuthors } from "@/lib/postAuthors";
import type { Payload, PostSchema } from "@/lib/types/type";

import { addInteractionFlags } from "../../../lib/apiUtils";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const rawCookie = req.cookies.velo_12;
    const cookie = rawCookie?.replace(/^"|"$/g, "");
    const payload = cookie ? ((await verifyToken(cookie)) as unknown as Payload) : null;

    if (!payload?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { limit: pageLimit, skip } = parsePaging(req);
    const db = await new MongoDBClient().init();

    // Get the IDs of everyone this user follows
    const followedDocs = await db
      .followers()
      .find({ followerId: payload._id }, { projection: { followedId: 1 } })
      .toArray();

    if (followedDocs.length === 0) {
      return res.json({
        data: [],
        pagination: pagingMeta(skip, pageLimit, false),
      });
    }

    // Anyone the user blocked or muted stays out of the following feed too.
    const hiddenIds = await getHiddenAuthorIds(db, payload._id);
    const followedIds = followedDocs
      .map((d: FollowersSchema) => d.followedId)
      .filter((id) => !hiddenIds.includes(id));

    const { posts, hasMore } = await fetchFollowingPostsPage(
      db,
      followedIds,
      skip,
      pageLimit,
      req.query.sort !== "latest"
    );

    const user = await db.users().findOne({ _id: new ObjectId(payload._id) });
    if (user) {
      await addInteractionFlags(db, posts as any, user._id.toString());
    }

    return res.json({
      data: posts,
      pagination: pagingMeta(skip, pageLimit, hasMore),
    });
  } catch (error) {
    console.error("Error fetching following posts:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function fetchFollowingPostsPage(
  db: MongoDBClient,
  followedIds: string[],
  skip: number,
  limit: number,
  ranked: boolean
) {
  const fetchLimit = limit + 1;

  const cursor = db.posts().aggregate([
    {
      $unionWith: {
        coll: "Posts_Shares",
        pipeline: [],
      },
    },
    { $match: { UserId: { $in: followedIds }, hidden: { $ne: true } } },
    ...(ranked ? buildRankingStages("following") : [{ $sort: { TimeOfPost: -1 } }]),
    { $skip: skip },
    { $limit: fetchLimit },
  ]);

  const batch = await cursor.toArray();
  const hasMore = batch.length > limit;
  const posts = await withAuthors(db, batch.slice(0, limit) as unknown as PostSchema[]);

  return { posts, hasMore };
}
