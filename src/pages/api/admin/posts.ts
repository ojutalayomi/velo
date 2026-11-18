import type { NextApiRequest, NextApiResponse } from "next";

import { logAdminAction, requireAdmin } from "@/lib/admin";
import { MongoDBClient } from "@/lib/mongodb";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { postId, action } = req.body || {};
  if (typeof postId !== "string" || !postId || postId.length > 100) {
    return res.status(400).json({ message: "Invalid post id" });
  }
  if (action !== "hide" && action !== "unhide") {
    return res.status(400).json({ message: "Invalid action" });
  }

  try {
    const db = await new MongoDBClient().init();
    const set =
      action === "hide"
        ? { hidden: true, hiddenBy: admin._id, hiddenAt: new Date().toISOString() }
        : { hidden: false };

    // A post can live in any of these collections (posts, comments, shares).
    const results = await Promise.all(
      [db.posts(), db.postsComments(), db.postsShares()].map((c) =>
        (c as unknown as { updateMany: (_f: object, _u: object) => Promise<{ matchedCount: number }> })
          .updateMany({ PostID: postId }, { $set: set })
      )
    );
    if (!results.some((r) => r.matchedCount > 0)) {
      return res.status(404).json({ message: "Post not found" });
    }

    await logAdminAction({ adminId: admin._id, action: `post_${action}`, targetId: postId });
    return res.status(200).json({ data: { hidden: action === "hide" } });
  } catch (error) {
    console.error("Admin posts error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
