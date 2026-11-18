import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { MAX_API_LIMIT, pagingMeta, parsePaging } from "@/lib/apiPagination";
import { verifyToken } from "@/lib/auth";
import { SocialMediaUser, UserSchema } from "@/lib/class/User";
import { FollowersSchema, MongoDBClient } from "@/lib/mongodb";
import { Payload } from "@/lib/types/type";

type ConnectionType = "followers" | "following";

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function getPayload(req: NextApiRequest): Promise<Payload | null> {
  const cookie = decodeURIComponent(req.cookies.velo_12 || "").replace(/"/g, "");
  if (!cookie) return null;

  try {
    return (await verifyToken(cookie)) as unknown as Payload;
  } catch {
    return null;
  }
}

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const username = firstQueryValue(req.query.username);
  const type = firstQueryValue(req.query.type) as ConnectionType | undefined;

  if (type !== "followers" && type !== "following") {
    return res.status(400).json({ message: "type must be either followers or following" });
  }

  try {
    const payload = await getPayload(req);
    const db = await new MongoDBClient().init();
    const users = db.users();
    const followers = db.followers();

    const target = await users.findOne({ username });
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    const targetId = target._id.toString();
    const viewerId = payload?._id;
    const isOwner = viewerId === targetId;

    if (target.isPrivate && !isOwner) {
      const viewerFollowsTarget = viewerId
        ? await followers.findOne({ followerId: viewerId, followedId: targetId })
        : null;

      if (!viewerFollowsTarget) {
        return res.status(403).json({ message: "This account is private" });
      }
    }

    const { limit: pageLimit, skip } = parsePaging(req, {
      defaultLimit: 20,
      maxLimit: MAX_API_LIMIT,
    });
    const fetchLimit = pageLimit + 1;
    const filter = type === "followers" ? { followedId: targetId } : { followerId: targetId };

    const rawConnections = await followers
      .find(filter)
      .sort({ time: -1 })
      .skip(skip)
      .limit(fetchLimit)
      .toArray();

    const hasMore = rawConnections.length > pageLimit;
    const pageConnections = rawConnections.slice(0, pageLimit);
    const relatedIds = pageConnections.map((row: FollowersSchema) =>
      type === "followers" ? row.followerId : row.followedId
    );

    const objectIds = relatedIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    const hydratedUsers = objectIds.length
      ? ((await users.find({ _id: { $in: objectIds } }).toArray()) as UserSchema[])
      : [];
    const usersById = new Map(hydratedUsers.map((user) => [user._id.toString(), user]));

    const orderedUsers = relatedIds
      .map((id) => usersById.get(id))
      .filter((user): user is UserSchema => Boolean(user));
    const safeUsers = orderedUsers.map((user) => new SocialMediaUser(user).getClientSafeData());

    const safeUserIds = safeUsers.map((user) => user._id.toString());
    const followedByViewer =
      viewerId && safeUserIds.length
        ? await followers
            .find({
              followerId: viewerId,
              followedId: { $in: safeUserIds.filter((id) => id !== viewerId) },
            })
            .toArray()
        : [];
    const followedByViewerIds = new Set(followedByViewer.map((row) => row.followedId));

    const data = safeUsers.map((user) => ({
      ...user,
      isFollowing: viewerId !== user._id.toString() && followedByViewerIds.has(user._id.toString()),
    }));

    return res.status(200).json({
      data,
      pagination: pagingMeta(skip, pageLimit, hasMore),
    });
  } catch (error) {
    console.error("Error fetching user connections:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
