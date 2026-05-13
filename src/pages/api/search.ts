import type { NextApiRequest, NextApiResponse } from "next";

import { addInteractionFlags } from "@/lib/apiUtils";
import { pagingMeta, parsePaging } from "@/lib/apiPagination";
import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { fetchPostsByCaptionMatch } from "@/lib/postSearch";
import type { Payload } from "@/lib/types/type";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const qRaw = String(Array.isArray(req.query.q) ? req.query.q[0] : req.query.q ?? "").trim();
    if (!qRaw) {
      return res.status(400).json({ message: "Query parameter q is required" });
    }

    const rawCookie = req.cookies.velo_12;
    const cookie = rawCookie?.replace(/^"|"$/g, "");
    const payload = cookie
      ? ((await verifyToken(cookie).catch(() => null)) as unknown as Payload | null)
      : null;

    const { limit: pageLimit, skip } = parsePaging(req);

    const db = await new MongoDBClient().init();
    const { posts, hasMore } = await fetchPostsByCaptionMatch(db, {
      kind: "text",
      term: qRaw,
      skip,
      limit: pageLimit,
    });

    if (payload?._id && posts.length > 0) {
      await addInteractionFlags(db, posts as never, payload._id);
    }

    return res.json({
      data: posts,
      pagination: pagingMeta(skip, pageLimit, hasMore),
    });
  } catch (error) {
    console.error("Error searching posts:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
