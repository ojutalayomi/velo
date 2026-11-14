import { MongoDBClient } from "@/lib/mongodb";
import type {
  InAppNotificationSchema,
  NotificationActor,
  NotificationGroup,
  NotificationTab,
} from "@/lib/types/type";

const NOTIFICATION_TABS: NotificationTab[] = ["all", "mentions", "verified"];

export function parseNotificationTab(value: string | null | undefined): NotificationTab {
  if (value && (NOTIFICATION_TABS as string[]).includes(value)) {
    return value as NotificationTab;
  }
  return "all";
}

export async function getBlockedActorIds(
  db: MongoDBClient,
  userId: string
): Promise<string[]> {
  const rows = await db
    .blockedUsers()
    .find({ blockerId: userId }, { projection: { _id: 0, blockedId: 1 } })
    .toArray();

  return rows.map((row) => row.blockedId).filter(Boolean);
}

function countUnread(
  db: MongoDBClient,
  userId: string,
  blockedActorIds: string[]
): Promise<number> {
  const filter: Record<string, unknown> = { userId, readAt: null };
  if (blockedActorIds.length > 0) filter.actorId = { $nin: blockedActorIds };

  return db.notifications().countDocuments(filter);
}

export async function getUnreadCount(db: MongoDBClient, userId: string): Promise<number> {
  const blockedActorIds = await getBlockedActorIds(db, userId);
  return countUnread(db, userId, blockedActorIds);
}

export function buildNotificationMatch(
  userId: string,
  tab: NotificationTab,
  blockedActorIds: string[]
): Record<string, unknown> {
  const match: Record<string, unknown> = { userId };

  if (tab === "mentions") match.type = "mention";
  if (tab === "verified") match["actor.verified"] = true;
  if (blockedActorIds.length > 0) match.actorId = { $nin: blockedActorIds };

  return match;
}

interface RawNotificationGroup {
  _id: string;
  latest: InAppNotificationSchema;
  actors: NotificationActor[];
  count: number;
  unread: number;
}

export function toNotificationGroup(raw: RawNotificationGroup): NotificationGroup {
  const actors: NotificationActor[] = [];
  const seen = new Set<string>();

  for (const actor of raw.actors) {
    if (!actor?.id || seen.has(actor.id)) continue;
    seen.add(actor.id);
    actors.push(actor);
  }

  return {
    groupKey: raw._id,
    type: raw.latest.type,
    targetType: raw.latest.targetType,
    targetId: raw.latest.targetId,
    url: raw.latest.url,
    snippet: raw.latest.snippet,
    latestAt: new Date(raw.latest.createdAt).toISOString(),
    count: raw.count,
    actorCount: actors.length,
    unread: Boolean(raw.unread),
    actors: actors.slice(0, 3),
  };
}

export interface ListNotificationsOptions {
  tab: NotificationTab;
  skip: number;
  limit: number;
}

export interface ListNotificationsResult {
  data: NotificationGroup[];
  hasMore: boolean;
  unreadCount: number;
}

export async function listNotificationGroups(
  db: MongoDBClient,
  userId: string,
  { tab, skip, limit }: ListNotificationsOptions
): Promise<ListNotificationsResult> {
  const blockedActorIds = await getBlockedActorIds(db, userId);
  const match = buildNotificationMatch(userId, tab, blockedActorIds);

  const rows = await db
    .notifications()
    .aggregate<RawNotificationGroup>([
      { $match: match },
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $group: {
          _id: "$groupKey",
          latest: { $first: "$$ROOT" },
          actors: { $push: "$actor" },
          count: { $sum: 1 },
          unread: {
            $max: {
              $cond: [{ $eq: ["$readAt", null] }, 1, 0],
            },
          },
        },
      },
      { $sort: { "latest.createdAt": -1 } },
      { $skip: skip },
      { $limit: limit + 1 },
    ])
    .toArray();

  const hasMore = rows.length > limit;
  const unreadCount = await countUnread(db, userId, blockedActorIds);

  return {
    data: rows.slice(0, limit).map(toNotificationGroup),
    hasMore,
    unreadCount,
  };
}

export async function markAllRead(
  db: MongoDBClient,
  userId: string,
  before: Date
): Promise<number> {
  const result = await db.notifications().updateMany(
    { userId, readAt: null, createdAt: { $lte: before } },
    { $set: { readAt: new Date() } }
  );

  return result.modifiedCount;
}
