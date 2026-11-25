import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { Payload } from "@/lib/types/type";
import { isStatusBackground, MAX_STATUS_TEXT } from "@/lib/statusBackgrounds";
import {
  StatusClient,
  StatusCreateInput,
  StatusGroup,
  StatusMediaType,
  StatusMention,
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
  mentions?: StatusMention[];
  viewers?: {
    viewerId: string;
    viewedAt: string;
  }[];
  likes?: { userId: string }[];
};

export async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const cookie = decodeURIComponent(cookieStore.get("velo_12")?.value || "").replace(/"/g, "");
  const payload = (await verifyToken(cookie)) as unknown as Payload;
  return payload?._id || null;
}

let expiryBackfilled = false;

export async function ensureStatusIndexes(db: MongoDBClient) {
  await Promise.all([
    // `expiresAt` is an ISO string, which MongoDB's TTL monitor ignores. The TTL index lives
    // on the Date-typed `expiresAtDate` instead (the string stays for API/query compatibility).
    db.statuses().createIndex({ expiresAtDate: 1 }, { expireAfterSeconds: 0 }),
    db.statuses().createIndex({ visibility: 1, expiresAt: -1 }),
    db.statuses().createIndex({ userId: 1, expiresAt: -1 }),
    db.statusViewers().createIndex({ statusId: 1, viewerId: 1 }, { unique: true }),
    db.statusViewers().createIndex({ ownerId: 1, viewedAt: -1 }),
    db.statusLikes().createIndex({ statusId: 1, userId: 1 }, { unique: true }),
    db.statusLikes().createIndex({ ownerId: 1, createdAt: -1 }),
  ]);

  if (!expiryBackfilled) {
    expiryBackfilled = true;
    // Statuses created before `expiresAtDate` existed: one pipeline update so the TTL index covers them.
    await db
      .statuses()
      .updateMany({ expiresAtDate: { $exists: false } }, [
        { $set: { expiresAtDate: { $toDate: "$expiresAt" } } },
      ])
      .catch((error) => {
        expiryBackfilled = false;
        console.error("[statuses] expiry backfill failed:", error);
      });
  }
}

export function statusExpiresAt(now = new Date()) {
  return new Date(now.getTime() + STATUS_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

export const MAX_STATUS_ITEMS = 10;
const MENTION_PATTERN = /\B@([a-zA-Z0-9_]{1,30})\b/g;

export interface StatusBatchItem {
  mediaType: StatusMediaType;
  mediaUrl: string;
  mediaKey: string;
  text?: string;
  background?: string;
  durationSec?: number;
}

export interface StatusBatchInput {
  items: StatusBatchItem[];
  caption: string;
}

export const MAX_STATUS_AUDIO_SECONDS = 5 * 60;

// Files for a status live in our own buckets: the status bucket, and the chat one (forwarding).
const STATUS_FILE_HOST = /^(post-s|files-for-chat)\.s3([.-][a-z0-9-]+)*\.amazonaws\.com$/;

/** True for an https link to one of our S3 buckets, which is all a status may point at. */
export function isStatusFileUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && STATUS_FILE_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Validates a create request: one caption shared by 1-10 photos/videos, or a single text status,
 * or a single voice status (with an optional caption).
 */
export function normalizeStatusBatch(input: unknown): StatusBatchInput | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<StatusCreateInput> & { items?: unknown };
  const rawItems = Array.isArray(raw.items) ? raw.items : [raw]; // single-item payloads still work
  if (rawItems.length === 0 || rawItems.length > MAX_STATUS_ITEMS) return null;

  const items: StatusBatchItem[] = [];
  for (const entry of rawItems) {
    const item = (entry ?? {}) as Partial<StatusCreateInput>;
    const mediaType = item.mediaType;

    if (mediaType === "text") {
      const text = typeof item.text === "string" ? item.text.trim().slice(0, MAX_STATUS_TEXT) : "";
      if (!text || !isStatusBackground(item.background)) return null;
      items.push({ mediaType, mediaUrl: "", mediaKey: "", text, background: item.background });
      continue;
    }

    const mediaUrl = typeof item.mediaUrl === "string" ? item.mediaUrl.trim() : "";
    const mediaKey = typeof item.mediaKey === "string" ? item.mediaKey.trim() : "";
    if (!mediaUrl || !mediaKey || mediaKey.length > 400 || !isStatusFileUrl(mediaUrl)) return null;

    if (mediaType === "audio") {
      const seconds = Number(item.durationSec);
      if (!Number.isFinite(seconds) || seconds < 1 || seconds > MAX_STATUS_AUDIO_SECONDS) return null;
      items.push({ mediaType, mediaUrl, mediaKey, durationSec: Math.round(seconds) });
      continue;
    }

    if (mediaType !== "image" && mediaType !== "video") return null;
    items.push({ mediaType, mediaUrl, mediaKey });
  }

  // A text or voice status stands alone; only photos and videos can be batched.
  if (items.length > 1 && items.some((i) => i.mediaType === "text" || i.mediaType === "audio")) {
    return null;
  }

  const caption = typeof raw.caption === "string" ? raw.caption.trim().slice(0, 700) : "";
  return { items, caption: items[0].mediaType === "text" ? "" : caption };
}

/** Resolves `@username` mentions in a caption to real accounts. */
export async function resolveStatusMentions(db: MongoDBClient, caption: string) {
  const usernames = Array.from(
    new Set(Array.from(caption.matchAll(MENTION_PATTERN), (m) => m[1].toLowerCase()))
  ).slice(0, 20);
  if (usernames.length === 0) return [];
  const users = await db
    .users()
    .find({ username: new RegExp(`^(?:${usernames.join("|")})$`, "i") })
    .project({ username: 1 })
    .toArray();
  return users.map((user) => ({ userId: user._id.toString(), username: String(user.username) }));
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
          from: "Status_Likes",
          localField: "statusIdString",
          foreignField: "statusId",
          pipeline: [{ $project: { _id: 0, userId: 1 } }],
          as: "likes",
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

export function groupStatusRows(rows: AggregatedStatus[], viewerId: string): StatusGroup[] {
  const groups = new Map<string, StatusGroup>();

  for (const row of rows) {
    const ownerId = row.userId;
    const ownerName =
      row.owner?.name ||
      `${row.owner?.firstname ?? ""} ${row.owner?.lastname ?? ""}`.trim() ||
      row.owner?.username ||
      "Velo user";
    const allViewers = (row.viewers ?? []).map((viewer) => ({
      userId: viewer.viewerId,
      viewedAt: viewer.viewedAt,
    }));
    const isOwner = ownerId === viewerId;
    const viewed = isOwner || allViewers.some((viewer) => viewer.userId === viewerId);
    const likes = row.likes ?? [];
    const status: StatusClient = {
      _id: row._id.toString(),
      userId: ownerId,
      mediaUrl: row.mediaUrl,
      mediaKey: row.mediaKey,
      mediaType: row.mediaType,
      caption: row.caption,
      ...(row.text !== undefined ? { text: row.text } : {}),
      ...(row.background ? { background: row.background } : {}),
      ...(row.durationSec ? { durationSec: row.durationSec } : {}),
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      visibility: row.visibility as StatusVisibility,
      mentions: row.mentions ?? [],
      viewed,
      // Who viewed it is the owner's business; everyone else only gets the count.
      viewers: isOwner ? allViewers : [],
      viewCount: allViewers.length,
      likeCount: likes.length,
      liked: likes.some((like) => like.userId === viewerId),
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


/** Whether `userId` follows `ownerId` (or is the owner): the people who may see, like and reply. */
export async function canSeeStatusOf(db: MongoDBClient, userId: string, ownerId: string) {
  if (userId === ownerId) return true;
  return Boolean(await db.followers().findOne({ followerId: userId, followedId: ownerId }));
}

/** A live (unexpired) status, or null. */
export async function findLiveStatus(db: MongoDBClient, id: string) {
  if (!ObjectId.isValid(id)) return null;
  return db.statuses().findOne({
    _id: new ObjectId(id),
    expiresAt: { $gt: new Date().toISOString() },
  });
}
