import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { Payload } from "@/lib/types/type";
import {
  StatusClient,
  StatusCreateInput,
  StatusGroup,
  StatusSchema,
  StatusVisibility,
} from "@/lib/types/status";

const STATUS_TTL_HOURS = 24;

type AggregatedStatus = StatusSchema & {
  _id: ObjectId;
  owner?: {
    _id: ObjectId;
    name?: string;
    firstname?: string;
    lastname?: string;
    username?: string;
    displayPicture?: string;
    verified?: boolean;
  };
  viewers?: {
    userId: string;
    viewedAt: string;
  }[];
};

export async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const cookie = decodeURIComponent(cookieStore.get("velo_12")?.value || "").replace(/"/g, "");
  const payload = (await verifyToken(cookie)) as unknown as Payload;
  return payload?._id || null;
}

export async function ensureStatusIndexes(db: MongoDBClient) {
  await Promise.all([
    db.statuses().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.statuses().createIndex({ userId: 1, expiresAt: -1 }),
    db.statusViewers().createIndex({ statusId: 1, viewerId: 1 }, { unique: true }),
    db.statusViewers().createIndex({ ownerId: 1, viewedAt: -1 }),
  ]);
}

export function statusExpiresAt(now = new Date()) {
  return new Date(now.getTime() + STATUS_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

export function normalizeStatusInput(input: Partial<StatusCreateInput>): StatusCreateInput | null {
  const mediaUrl = typeof input.mediaUrl === "string" ? input.mediaUrl.trim() : "";
  const mediaKey = typeof input.mediaKey === "string" ? input.mediaKey.trim() : "";
  const mediaType = input.mediaType;
  const caption = typeof input.caption === "string" ? input.caption.trim().slice(0, 700) : "";
  const visibility = input.visibility === "everyone" ? "everyone" : "followers";

  if (!mediaUrl || !mediaKey || (mediaType !== "image" && mediaType !== "video")) {
    return null;
  }

  return { mediaUrl, mediaKey, mediaType, caption, visibility };
}

export async function getFollowedUserIds(db: MongoDBClient, userId: string) {
  const following = await db
    .followers()
    .find({ followerId: userId })
    .project({ followedId: 1 })
    .toArray();
  return following.map((row) => row.followedId).filter(Boolean);
}

export async function getFollowerUserIds(db: MongoDBClient, userId: string) {
  const followers = await db
    .followers()
    .find({ followedId: userId })
    .project({ followerId: 1 })
    .toArray();
  return Array.from(new Set(followers.map((row) => row.followerId).filter(Boolean)));
}

export async function getStatusGroupsForUser(db: MongoDBClient, viewerId: string) {
  const followedIds = await getFollowedUserIds(db, viewerId);
  const visibleUserIds = Array.from(new Set([viewerId, ...followedIds]));
  return getStatusGroups(db, visibleUserIds, viewerId);
}

export async function getStatusGroupForOwner(db: MongoDBClient, ownerId: string, viewerId = ownerId) {
  const groups = await getStatusGroups(db, [ownerId], viewerId);
  return groups[0] || null;
}

async function getStatusGroups(db: MongoDBClient, userIds: string[], viewerId: string) {
  if (!userIds.length) return [];

  const now = new Date().toISOString();
  const rows = (await db
    .statuses()
    .aggregate([
      {
        $match: {
          userId: { $in: userIds },
          expiresAt: { $gt: now },
          $or: [{ visibility: "everyone" }, { visibility: "followers" }, { userId: viewerId }],
        },
      },
      {
        $addFields: {
          statusIdString: { $toString: "$_id" },
          ownerObjectId: { $toObjectId: "$userId" },
        },
      },
      {
        $lookup: {
          from: "Status_Viewers",
          localField: "statusIdString",
          foreignField: "statusId",
          as: "viewers",
        },
      },
      {
        $lookup: {
          from: "Users",
          localField: "ownerObjectId",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: "$owner" },
      { $sort: { createdAt: 1 } },
    ])
    .toArray()) as AggregatedStatus[];

  return groupStatusRows(rows, viewerId);
}

function groupStatusRows(rows: AggregatedStatus[], viewerId: string): StatusGroup[] {
  const groups = new Map<string, StatusGroup>();

  for (const row of rows) {
    const ownerId = row.userId;
    const ownerName =
      row.owner?.name ||
      `${row.owner?.firstname ?? ""} ${row.owner?.lastname ?? ""}`.trim() ||
      row.owner?.username ||
      "Velo user";
    const viewers = (row.viewers ?? []).map((viewer) => ({
      userId: viewer.userId,
      viewedAt: viewer.viewedAt,
    }));
    const isOwner = ownerId === viewerId;
    const viewed = isOwner || viewers.some((viewer) => viewer.userId === viewerId);
    const status: StatusClient = {
      _id: row._id.toString(),
      userId: ownerId,
      mediaUrl: row.mediaUrl,
      mediaKey: row.mediaKey,
      mediaType: row.mediaType,
      caption: row.caption,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      visibility: row.visibility as StatusVisibility,
      viewed,
      viewers,
    };

    const existing = groups.get(ownerId);
    if (existing) {
      existing.statuses.push(status);
      existing.latestAt = status.createdAt;
      existing.hasUnviewed = existing.hasUnviewed || !viewed;
    } else {
      groups.set(ownerId, {
        user: {
          _id: ownerId,
          name: ownerName,
          username: row.owner?.username || "",
          displayPicture: row.owner?.displayPicture || "",
          verified: Boolean(row.owner?.verified),
        },
        statuses: [status],
        hasUnviewed: !viewed,
        latestAt: status.createdAt,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => Date.parse(b.latestAt) - Date.parse(a.latestAt));
}

