import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { pagingMeta, parsePaging } from "@/lib/apiPagination";
import { addInteractionFlags } from "@/lib/apiUtils";
import { MongoDBClient } from "@/lib/mongodb";
import type { Payload, PostBookmarkSchema, PostSchema } from "@/lib/types/type";

const DEFAULT_LIMIT = 20;

function matchesQuery(post: PostSchema, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const terms = needle.split(/\s+/).filter(Boolean);
  const hay = [post.Caption ?? "", post.Username ?? "", post.NameOfPoster ?? "", post.PostID ?? ""]
    .join(" ")
    .toLowerCase();
  return terms.every((t) => hay.includes(t));
}

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
    const { limit: pageLimit, skip } = parsePaging(req, {
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: 50,
    });

    const rawQ = req.query.q;
    const q = String(Array.isArray(rawQ) ? rawQ[0] : rawQ ?? "").trim();

    const db = await new MongoDBClient().init();
    const bookmarksCol = db.postsBookmarks();

    const allBookmarks = await bookmarksCol
      .find({ userId })
      .sort({ _id: -1 })
      .toArray();

    const postIds = [...new Set(allBookmarks.map((b: PostBookmarkSchema) => String(b.postId)))];

    if (postIds.length === 0) {
      return res.json({
        data: [] as PostSchema[],
        pagination: pagingMeta(skip, pageLimit, false),
      });
    }

    const [fromPosts, fromShares, fromComments] = await Promise.all([
      db.posts().find({ PostID: { $in: postIds } }).toArray(),
      db.postsShares().find({ PostID: { $in: postIds } }).toArray(),
      db.postsComments().find({ PostID: { $in: postIds } }).toArray(),
    ]);

    const byPostId = new Map<string, PostSchema>();
    for (const doc of [...fromPosts, ...fromShares, ...fromComments]) {
      const p = doc as unknown as PostSchema;
      if (p.PostID) byPostId.set(p.PostID, p);
    }

    const ordered: PostSchema[] = [];
    for (const b of allBookmarks) {
      const pid = String(b.postId);
      const post = byPostId.get(pid);
      if (post && matchesQuery(post, q)) {
        ordered.push(post);
      }
    }

    const fetchEnd = skip + pageLimit + 1;
    const window = ordered.slice(skip, fetchEnd);
    const hasMore = window.length > pageLimit;
    const pagePosts = window.slice(0, pageLimit) as unknown as PostSchema[];

    const user = await db.users().findOne({ _id: new ObjectId(userId) });
    if (user) {
      await addInteractionFlags(db, pagePosts as any, userId);
    }

    for (const p of pagePosts) {
      p.Bookmarked = true;
    }

    return res.json({
      data: pagePosts,
      pagination: pagingMeta(skip, pageLimit, hasMore),
    });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
