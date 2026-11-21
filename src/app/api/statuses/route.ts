import { ObjectId } from "mongodb";
import { after, NextResponse } from "next/server";

import { emitViaSocketServer } from "@/lib/socket";
import {
  ensureStatusIndexes,
  getAuthenticatedUserId,
  getFollowerUserIds,
  getStatusGroupForOwner,
  getStatusGroupsForUser,
  normalizeStatusBatch,
  resolveStatusMentions,
  statusExpiresAt,
} from "@/lib/statusServer";
import { MongoDBClient } from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const db = await new MongoDBClient().init();
    await ensureStatusIndexes(db);
    const groups = await getStatusGroupsForUser(db, userId);

    // Explore shows the statuses of people you follow, without your own.
    const scope = new URL(request.url).searchParams.get("scope");
    return NextResponse.json({
      data: scope === "explore" ? groups.filter((group) => group.user._id !== userId) : groups,
    });
  } catch (error) {
    console.error("[api/statuses] GET failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const input = normalizeStatusBatch(await request.json().catch(() => ({})));
    if (!input) return NextResponse.json({ message: "Invalid status payload" }, { status: 400 });

    const now = new Date();
    const createdAt = now.toISOString();
    const expiresAt = statusExpiresAt(now);
    const db = await new MongoDBClient().init();
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
          await emitViaSocketServer(userId, "status:create", { group: broadcastGroup, targetUserIds });
        } catch (error) {
          console.error("[api/statuses] status:create socket emit failed:", error);
        }
      });
    }

    return NextResponse.json({ data: group ? [group] : [] }, { status: 201 });
  } catch (error) {
    console.error("[api/statuses] POST failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
