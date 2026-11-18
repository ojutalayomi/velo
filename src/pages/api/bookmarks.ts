import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { pagingMeta } from "@/lib/apiPagination";
import { addInteractionFlags } from "@/lib/apiUtils";
import { ensurePostBookmarkIndexes } from "@/lib/bookmarkIndexes";
import { sanitizeMongoTextSearch } from "@/lib/bookmarkSearch";
import { MongoDBClient } from "@/lib/mongodb";
import type { Payload, PostSchema } from "@/lib/types/type";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function parseBookmarksLimit(req: NextApiRequest): number {
  const raw = req.query.limit;
  if (raw === undefined || raw === "") return DEFAULT_LIMIT;
  const n = parseInt(String(Array.isArray(raw) ? raw[0] : raw), 10);
  if (Number.isNaN(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

type BookmarkAggRow = { _id: ObjectId; post: PostSchema };

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const cookie = decodeURIComponent(req.cookies.velo_12 || "").replace(/"/g, "");
    const payload = (await verifyToken(cookie)) as unknown as Payload | null;
    if (!payload?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = String(payload._id);
    const limit = parseBookmarksLimit(req);

    const rawCursor = req.query.cursor;
    const cursorStr = rawCursor ? String(Array.isArray(rawCursor) ? rawCursor[0] : rawCursor) : "";
    let cursorOid: ObjectId | null = null;
    if (cursorStr) {
      try {
        cursorOid = new ObjectId(cursorStr);
      } catch {
        return res.status(400).json({ message: "Invalid cursor" });
      }
    }

    const qRaw = String(Array.isArray(req.query.q) ? req.query.q[0] : req.query.q ?? "").trim();
    const qSanitized = sanitizeMongoTextSearch(qRaw);

    const db = await new MongoDBClient().init();
    const bookmarksCol = db.postsBookmarks();
    await ensurePostBookmarkIndexes(bookmarksCol);

    const match: Record<string, unknown> = { userId };
    if (cursorOid) {
      match._id = { $lt: cursorOid };
    }
    if (qSanitized) {
      match.$text = { $search: qSanitized };
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "Posts",
          localField: "postId",
          foreignField: "PostID",
          as: "_fromPosts",
        },
      },
      {
        $lookup: {
          from: "Posts_Shares",
          localField: "postId",
          foreignField: "PostID",
          as: "_fromShares",
        },
      },
      {
        $lookup: {
          from: "Posts_Comments",
          localField: "postId",
          foreignField: "PostID",
          as: "_fromComments",
        },
      },
      {
        $set: {
          post: {
            $arrayElemAt: [
              { $concatArrays: ["$_fromPosts", "$_fromShares", "$_fromComments"] },
              0,
            ],
          },
        },
      },
      { $match: { post: { $ne: null } } },
      { $sort: { _id: -1 } },
      { $limit: limit + 1 },
      {
        $project: {
          _id: 1,
          post: 1,
        },
      },
    ];

    const rows = (await bookmarksCol.aggregate(pipeline).toArray()) as unknown as BookmarkAggRow[];

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const pagePosts = pageRows.map((r) => r.post as PostSchema);

    const nextCursor =
      hasMore && pageRows.length > 0 ? String(pageRows[pageRows.length - 1]._id) : null;

    const user = await db.users().findOne({ _id: new ObjectId(userId) });
    if (user && pagePosts.length > 0) {
      await addInteractionFlags(db, pagePosts as any, userId);
    }

    for (const p of pagePosts) {
      p.Bookmarked = true;
    }

    return res.json({
      data: pagePosts,
      pagination: pagingMeta(0, limit, hasMore, nextCursor),
    });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
