import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { pagingMeta, parsePaging } from "@/lib/apiPagination";
import { verifyToken } from "@/lib/auth";
import { SocialMediaUser, UserSchema } from "@/lib/class/User";
import { MongoDBClient } from "@/lib/mongodb";
import type { Payload } from "@/lib/types/type";

/**
 * GET /api/explore/people — suggested accounts: most-followed users the viewer
 * does not follow yet, excluding themselves and anyone blocked in either direction.
 */
export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const rawCookie = req.cookies.velo_12;
    const cookie = rawCookie ? decodeURIComponent(rawCookie).replace(/"/g, "") : "";
    const payload = cookie
      ? ((await verifyToken(cookie).catch(() => null)) as unknown as Payload | null)
      : null;

    const { limit, skip } = parsePaging(req, { defaultLimit: 12, maxLimit: 30 });
    const db = await new MongoDBClient().init();

    const excluded = new Set<string>();
    if (payload?._id) {
      const viewerId = String(payload._id);
      excluded.add(viewerId);
      const [following, blocks] = await Promise.all([
        db.followers().find({ followerId: viewerId }, { projection: { followedId: 1 } }).toArray(),
        db
          .blockedUsers()
          .find(
            { $or: [{ blockerId: viewerId }, { blockedId: viewerId }] },
            { projection: { blockerId: 1, blockedId: 1 } }
          )
          .toArray(),
      ]);
      following.forEach((f) => excluded.add(String(f.followedId)));
      blocks.forEach((b) => {
        excluded.add(String(b.blockerId));
        excluded.add(String(b.blockedId));
      });
    }
    const excludedIds = [...excluded].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

    const raw = await db
      .users()
      .find({
        username: { $exists: true, $ne: "" },
        ...(excludedIds.length ? { _id: { $nin: excludedIds } } : {}),
      })
      .sort({ followers: -1, _id: 1 })
      .skip(skip)
      .limit(limit + 1)
      .toArray();

    const hasMore = raw.length > limit;
    const data = raw.slice(0, limit).map((user) => {
      const safe = new SocialMediaUser(user as UserSchema).getClientSafeData();
      safe.isFollowing = false;
      return safe;
    });

    return res.status(200).json({ data, pagination: pagingMeta(skip, limit, hasMore) });
  } catch (error) {
    console.error("Error fetching explore people:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
