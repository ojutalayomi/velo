import type { NextApiRequest, NextApiResponse } from "next";

import { addInteractionFlags } from "@/lib/apiUtils";
import { withAuthors } from "@/lib/postAuthors";
import { pagingMeta, parsePaging } from "@/lib/apiPagination";
import { verifyToken } from "@/lib/auth";
import { buildRankingStages } from "@/lib/feedRanking";
import { IMAGE_URL_PATTERN } from "@/lib/mediaType";
import { excludeAuthors, getHiddenAuthorIds } from "@/lib/hiddenAuthors";
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

    const hiddenIds = payload?._id ? await getHiddenAuthorIds(db, payload._id) : [];
    const { posts, hasMore } = await fetchExplorePosts(db, skip, pageLimit, filter, hiddenIds);

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

function parseFilter(value: string | string[] | undefined): ExploreFilter | null {
  if (value === undefined || value === "") return "all";
  if (typeof value !== "string" || !FILTERS.has(value as ExploreFilter)) return null;
  return value as ExploreFilter;
}

async function fetchExplorePosts(
  db: MongoDBClient,
  skip: number,
  limit: number,
  filter: ExploreFilter,
  hiddenIds: string[]
) {
  const fetchLimit = limit + 1;

  // Only posts that have at least one media item
  const match: Record<string, unknown> = {
    "Image.0": { $exists: true },
    hidden: { $ne: true },
    ...excludeAuthors(hiddenIds),
  };
  if (filter === "photos") {
    match["Image.0"] = { $exists: true, $regex: IMAGE_URL_PATTERN, $options: "i" };
  } else if (filter === "videos") {
    match["Image.0"] = { $exists: true, $not: new RegExp(IMAGE_URL_PATTERN, "i") };
  }

  const pipeline: Record<string, unknown>[] = [
    { $unionWith: { coll: "Posts_Shares", pipeline: [] } },
    { $match: match },
  ];
  // popular = all-time engagement; hot = engagement with time decay (trending now).
  pipeline.push(
    ...(filter === "popular" || filter === "hot"
      ? buildRankingStages(filter)
      : [{ $sort: { TimeOfPost: -1 } }])
  );
  pipeline.push({ $skip: skip }, { $limit: fetchLimit });

  const batch = await db.posts().aggregate(pipeline).toArray();
  const hasMore = batch.length > limit;
  const posts = await withAuthors(db, batch.slice(0, limit) as unknown as PostSchema[]);

  return { posts, hasMore };
}
