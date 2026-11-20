import type { NextApiRequest, NextApiResponse } from "next";

import { addInteractionFlags } from "@/lib/apiUtils";
import { pagingMeta, parsePaging } from "@/lib/apiPagination";
import { verifyToken } from "@/lib/auth";
import { IMAGE_URL_PATTERN } from "@/lib/mediaType";
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

    const filter = parseFilter(req.query.filter);
    if (filter === null) {
      return res.status(400).json({ message: "filter must be one of all, photos, videos, popular, hot" });
    }

    const { posts, hasMore } = await fetchExplorePosts(db, skip, pageLimit, filter);

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

type ExploreFilter = "all" | "photos" | "videos" | "popular" | "hot";
const FILTERS = new Set<ExploreFilter>(["all", "photos", "videos", "popular", "hot"]);
/** "hot" = most engaged posts from the last week, backfilled with older top posts when quiet. */
const HOT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function parseFilter(value: string | string[] | undefined): ExploreFilter | null {
  if (value === undefined || value === "") return "all";
  if (typeof value !== "string" || !FILTERS.has(value as ExploreFilter)) return null;
  return value as ExploreFilter;
}

async function fetchExplorePosts(
  db: MongoDBClient,
  skip: number,
  limit: number,
  filter: ExploreFilter
) {
  const fetchLimit = limit + 1;

  // Only posts that have at least one media item
  const match: Record<string, unknown> = { "Image.0": { $exists: true }, hidden: { $ne: true } };
  if (filter === "photos") {
    match["Image.0"] = { $exists: true, $regex: IMAGE_URL_PATTERN, $options: "i" };
  } else if (filter === "videos") {
    match["Image.0"] = { $exists: true, $not: new RegExp(IMAGE_URL_PATTERN, "i") };
  }

  const ranked = filter === "popular" || filter === "hot";
  const hotCutoff = new Date(Date.now() - HOT_WINDOW_MS).toISOString();
  const pipeline: Record<string, unknown>[] = [
    { $unionWith: { coll: "Posts_Shares", pipeline: [] } },
    { $match: match },
  ];
  if (ranked) {
    pipeline.push(
      {
        $addFields: {
          // Posts from the hot window always outrank older ones, so older posts only
          // backfill when fewer than `limit` recent posts exist. TimeOfPost is an ISO
          // string, so lexicographic comparison is chronological.
          _exploreRecent:
            filter === "hot"
              ? { $cond: [{ $gte: ["$TimeOfPost", hotCutoff] }, 1, 0] }
              : 0,
          _exploreScore: {
            $add: [{ $ifNull: ["$NoOfLikes", 0] }, { $multiply: [{ $ifNull: ["$NoOfComment", 0] }, 2] }],
          },
        },
      },
      { $sort: { _exploreRecent: -1, _exploreScore: -1, TimeOfPost: -1, _id: -1 } },
      { $project: { _exploreScore: 0, _exploreRecent: 0 } }
    );
  } else {
    pipeline.push({ $sort: { TimeOfPost: -1 } });
  }
  pipeline.push({ $skip: skip }, { $limit: fetchLimit });

  const batch = await db.posts().aggregate(pipeline).toArray();
  const hasMore = batch.length > limit;
  const posts = batch.slice(0, limit) as unknown as PostSchema[];

  return { posts, hasMore };
}
