import { ObjectId } from "mongodb";
import { after } from "next/server";

import { MongoDBClient } from "@/lib/mongodb";
import { emitViaSocketServer } from "@/lib/socket";
import {
  ensureStatusIndexes,
  getFollowerUserIds,
  getStatusGroupForOwner,
  normalizeStatusBatch,
  resolveStatusMentions,
  statusExpiresAt,
} from "@/lib/statusServer";
import type { StatusGroup } from "@/lib/types/status";

/**
 * Posts a status for a user from a raw create payload and announces it to their followers.
 * Shared by `POST /api/statuses` and forwarding a chat message to status, so the broadcast
 * lives in one place. Returns null when the payload isn't a valid status.
 */
export async function createStatusForUser(
  userId: string,
  raw: unknown,
  db?: MongoDBClient
): Promise<{ group: StatusGroup | null } | null> {
  const input = normalizeStatusBatch(raw);
  if (!input) return null;
  db ??= await new MongoDBClient().init();

  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = statusExpiresAt(now);
  await ensureStatusIndexes(db);
  const mentions = await resolveStatusMentions(db, input.caption);

  // One request inserts every item or none, so a failure never leaves a half-posted story.
  // Items get increasing timestamps to keep the slide order stable.
  const docs = input.items.map((item, index) => ({
    _id: new ObjectId(),
    userId,
    ...item,
    caption: input.caption,
    mentions,
    visibility: "followers" as const,
    createdAt: new Date(now.getTime() + index).toISOString(),
    expiresAt,
    expiresAtDate: new Date(expiresAt),
  }));
  await db.statuses().insertMany(docs, { ordered: true });

  const [group, targetUserIds] = await Promise.all([
    getStatusGroupForOwner(db, userId),
    getFollowerUserIds(db, userId),
  ]);
  // The owner's other devices need the update too.
  const recipients = Array.from(new Set([userId, ...targetUserIds]));

  if (group) {
    const newIds = new Set(docs.map((doc) => doc._id.toString()));
    const newStatuses = group.statuses
      .filter((status) => newIds.has(status._id))
      .map((status) => ({ ...status, viewed: false, viewers: [] }));
    const broadcastGroup = {
      ...group,
      statuses: newStatuses,
      hasUnviewed: true,
      latestAt: newStatuses.at(-1)?.createdAt ?? createdAt,
    };
    // Best-effort realtime fan-out: runs after the response so a slow socket server
    // can never turn a saved status into a gateway timeout.
    after(async () => {
      try {
        await emitViaSocketServer(userId, "status:create", { group: broadcastGroup, targetUserIds: recipients });
      } catch (error) {
        console.error("[api/statuses] status:create socket emit failed:", error);
      }
    });
  }


  return { group: group ?? null };
}
