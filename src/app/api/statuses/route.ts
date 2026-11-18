import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { emitViaSocketServer } from "@/lib/socket";
import {
  ensureStatusIndexes,
  getAuthenticatedUserId,
  getFollowerUserIds,
  getStatusGroupForOwner,
  getStatusGroupsForUser,
  normalizeStatusInput,
  statusExpiresAt,
} from "@/lib/statusServer";
import { MongoDBClient } from "@/lib/mongodb";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const db = await new MongoDBClient().init();
    await ensureStatusIndexes(db);
    const groups = await getStatusGroupsForUser(db, userId);

    return NextResponse.json({ data: groups });
  } catch (error) {
    console.error("[api/statuses] GET failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const input = normalizeStatusInput(await request.json().catch(() => ({})));
    if (!input) return NextResponse.json({ message: "Invalid status payload" }, { status: 400 });

    const now = new Date().toISOString();
    const db = await new MongoDBClient().init();
    await ensureStatusIndexes(db);

    const insertResult = await db.statuses().insertOne({
      _id: new ObjectId(),
      userId,
      mediaUrl: input.mediaUrl,
      mediaKey: input.mediaKey,
      mediaType: input.mediaType,
      caption: input.caption || "",
      visibility: input.visibility || "followers",
      createdAt: now,
      expiresAt: statusExpiresAt(new Date(now)),
    });

    const [group, targetUserIds] = await Promise.all([
      getStatusGroupForOwner(db, userId),
      getFollowerUserIds(db, userId),
    ]);

    if (group) {
      const newStatusId = insertResult.insertedId.toString();
      const newStatus = group.statuses.find((status) => status._id === newStatusId);
      const broadcastGroup =
        newStatus === undefined
          ? group
          : {
              ...group,
              statuses: [{ ...newStatus, viewed: false, viewers: [] }],
              hasUnviewed: true,
              latestAt: newStatus.createdAt,
            };
      try {
        await emitViaSocketServer(userId, "status:create", {
          group: broadcastGroup,
          targetUserIds,
        });
      } catch (error) {
        console.error("[api/statuses] status:create socket emit failed:", error);
      }
    }

    return NextResponse.json({ data: group ? [group] : [] }, { status: 201 });
  } catch (error) {
    console.error("[api/statuses] POST failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
