import { ObjectId } from "mongodb";
import { after, NextResponse } from "next/server";

import { MongoDBClient } from "@/lib/mongodb";
import { emitViaSocketServer } from "@/lib/socket";
import {
  canSeeStatusOf,
  ensureStatusIndexes,
  findLiveStatus,
  getAuthenticatedUserId,
} from "@/lib/statusServer";

/** Like (POST) or unlike (DELETE) a status. Both are idempotent and answer with the new totals. */
async function setLiked(id: string, liked: boolean) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid status id" }, { status: 400 });
  }

  const db = await new MongoDBClient().init();
  await ensureStatusIndexes(db);
  const status = await findLiveStatus(db, id);
  if (!status) return NextResponse.json({ message: "Status not found" }, { status: 404 });

  // Statuses are only visible to followers of the owner (the owner may like their own).
  if (!(await canSeeStatusOf(db, userId, status.userId))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (liked) {
    await db.statusLikes().updateOne(
      { statusId: id, userId },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          statusId: id,
          ownerId: status.userId,
          userId,
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  } else {
    await db.statusLikes().deleteOne({ statusId: id, userId });
  }
  const likeCount = await db.statusLikes().countDocuments({ statusId: id });

  after(async () => {
    try {
      await emitViaSocketServer(userId, "status:like", { statusId: id });
    } catch (error) {
      console.error("[api/statuses] status:like socket emit failed:", error);
    }
  });

  return NextResponse.json({ message: liked ? "Liked" : "Unliked", data: { liked, likeCount } });
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await setLiked((await params).id, true);
  } catch (error) {
    console.error("[api/statuses/:id/like] POST failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await setLiked((await params).id, false);
  } catch (error) {
    console.error("[api/statuses/:id/like] DELETE failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
