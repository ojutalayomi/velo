import type { NextApiRequest, NextApiResponse } from "next";

import { addInteractionFlags } from "@/lib/apiUtils";
import { pagingMeta, DEFAULT_POST_LIMIT, MAX_API_LIMIT, parsePaging } from "@/lib/apiPagination";
import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import type { Payload, PostSchema } from "@/lib/types/type";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { username } = req.query;

  try {
    const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : "").replace(
      /"/g,
      ""
    );
    let payload: Payload | undefined;
    if (cookie !== "") {
      await verifyToken(cookie)
        .then((p) => {
          payload = p as unknown as Payload;
        })
        .catch((error) => {
          console.error("Error: ", error);
        });
    }
    const { limit: pageLimit, skip } = parsePaging(req, {
      defaultLimit: DEFAULT_POST_LIMIT,
      maxLimit: MAX_API_LIMIT,
    });

    const db = await new MongoDBClient().init();
    const users = db.users();
    const user = await users.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userIdStr = user._id.toString();
    const usernameStr = user.username as string;
    const database = await db.getDb();
    const fetchLimit = pageLimit + 1;

    const pipeline = [
      {
        $match: {
          $or: [{ UserId: userIdStr }, { Username: usernameStr }],
        },
      },
      {
        $unionWith: {
          coll: "Posts_Comments",
          pipeline: [{ $match: { UserId: userIdStr } }],
        },
      },
      {
        $unionWith: {
          coll: "Posts_Shares",
          pipeline: [{ $match: { UserId: userIdStr } }],
        },
      },
      { $sort: { TimeOfPost: -1 } },
      { $skip: skip },
      { $limit: fetchLimit },
    ];

    const batch = await database.collection("Posts").aggregate(pipeline).toArray();
    const hasMore = batch.length > pageLimit;
    const combinedPosts = batch.slice(0, pageLimit) as unknown as PostSchema[];

    await addInteractionFlags(db, combinedPosts, payload?._id as string);

    return res.status(200).json({
      data: combinedPosts,
      pagination: pagingMeta(skip, pageLimit, hasMore),
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
