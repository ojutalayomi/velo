import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { MongoDBClient } from "@/lib/mongodb";
import { emitViaSocketServer } from "@/lib/socket";
import {
  ensureStatusIndexes,
  getAuthenticatedUserId,
  getFollowerUserIds,
} from "@/lib/statusServer";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid status id" }, { status: 400 });
    }

    const db = await new MongoDBClient().init();
    await ensureStatusIndexes(db);
    const status = await db.statuses().findOne({ _id: new ObjectId(id) });
    if (!status) return NextResponse.json({ message: "Status not found" }, { status: 404 });
    if (status.userId !== userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await Promise.all([
      db.statuses().deleteOne({ _id: new ObjectId(id), userId }),
      db.statusViewers().deleteMany({ statusId: id }),
    ]);

    const targetUserIds = await getFollowerUserIds(db, userId);
    try {
      await emitViaSocketServer(userId, "status:delete", {
        statusId: id,
        ownerId: userId,
        targetUserIds,
      });
    } catch (error) {
      console.error("[api/statuses] status:delete socket emit failed:", error);
    }

    return NextResponse.json({ message: "Status deleted" });
  } catch (error) {
    console.error("[api/statuses/:id] DELETE failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

