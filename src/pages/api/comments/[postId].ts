import { addInteractionFlags } from "@/lib/apiUtils";
import {
  pagingMeta,
  DEFAULT_COMMENT_LIMIT,
  MAX_API_LIMIT,
  parsePaging,
} from "@/lib/apiPagination";
import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { Payload } from "@/lib/types/type";
import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    const postId = req.query.postId as string | undefined;
    if (!postId) return res.status(400).json({ error: "postId required" });

    const { limit: pageLimit, skip } = parsePaging(req, {
      defaultLimit: DEFAULT_COMMENT_LIMIT,
      maxLimit: MAX_API_LIMIT,
    });

    const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : "").replace(
      /"/g,
      ""
    );
    let payload: Payload | null = null;
    try {
      if (cookie)
        payload = (await verifyToken(cookie as unknown as string)) as unknown as Payload;
    } catch {
      payload = null;
    }

    const db = await new MongoDBClient().init();
    const collection = db.users();
    const commentsCollection = db.postsComments();
    const fetchLimit = pageLimit + 1;

    const docs = await commentsCollection
      .find({ ParentId: postId })
      .sort({ TimeOfPost: -1 })
      .skip(skip)
      .limit(fetchLimit)
      .toArray();

    const hasMore = docs.length > pageLimit;
    const comments = docs.slice(0, pageLimit);

    await Promise.all(
      comments.map(async (comment) => {
        const usr = await collection.findOne({ username: comment.Username });
        comment.DisplayPicture = usr?.displayPicture || "";
      })
    );

    const user =
      payload?._id != null ? await collection.findOne({ _id: new ObjectId(payload._id) }) : null;

    if (user) {
      await addInteractionFlags(db, comments, user._id.toString());
    }

    const body = user
      ? { comments, message: "Success" as const }
      : { comments, messge: "Sign in" as const };

    return res.status(200).json({
      data: body,
      pagination: pagingMeta(skip, pageLimit, hasMore),
    });
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).json({ error: err });
  }
}
