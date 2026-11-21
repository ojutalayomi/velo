import { ObjectId } from "mongodb";
import { after, NextResponse } from "next/server";

import { MongoDBClient } from "@/lib/mongodb";
import { emitViaSocketServer } from "@/lib/socket";
import { ensureStatusIndexes, getAuthenticatedUserId } from "@/lib/statusServer";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewerId = await getAuthenticatedUserId();
    if (!viewerId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid status id" }, { status: 400 });
    }

    const db = await new MongoDBClient().init();
    await ensureStatusIndexes(db);
    const status = await db.statuses().findOne({
      _id: new ObjectId(id),
      expiresAt: { $gt: new Date().toISOString() },
    });
    if (!status) return NextResponse.json({ message: "Status not found" }, { status: 404 });

    if (status.userId === viewerId) {
      return NextResponse.json({ message: "Owner views are not tracked" });
    }

    // Statuses are only visible to followers of the owner.
    const canView = await db.followers().findOne({
      followerId: viewerId,
      followedId: status.userId,
    });
    if (!canView) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const viewedAt = new Date().toISOString();
    await db.statusViewers().updateOne(
      { statusId: id, viewerId },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          statusId: id,
          ownerId: status.userId,
          viewerId,
          viewedAt,
        },
      },
      { upsert: true }
    );

    after(async () => {
      try {
        await emitViaSocketServer(viewerId, "status:view", {
          statusId: id,
          ownerId: status.userId,
          viewerId,
          viewedAt,
        });
      } catch (error) {
        console.error("[api/statuses] status:view socket emit failed:", error);
      }
    });

    return NextResponse.json({ message: "Status viewed", data: { viewedAt } });
  } catch (error) {
    console.error("[api/statuses/:id/view] POST failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
