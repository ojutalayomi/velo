import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { blockUser, getBlockedUserIds, listBlocked, unblockUser } from "@/lib/blocks";
import { MongoDBClient } from "@/lib/mongodb";
import { relatedUsers } from "@/lib/relatedUsers";

async function resolveTargetUserId(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("userId");
  if (fromQuery) return fromQuery.trim();

  const body = await request.json().catch(() => null);
  const fromBody = typeof body?.userId === "string" ? body.userId.trim() : "";
  return fromBody || null;
}

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // `?details=1` adds the accounts themselves, for the blocked list in settings.
  if (new URL(request.url).searchParams.get("details") === "1") {
    const db = await new MongoDBClient().init();
    const users = await relatedUsers(db, await listBlocked(userId));
    return NextResponse.json({ blockedUserIds: users.map((user) => user._id), users });
  }

  const blockedUserIds = await getBlockedUserIds(userId);
  return NextResponse.json({ blockedUserIds });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const targetId = await resolveTargetUserId(request);
  if (!targetId || !ObjectId.isValid(targetId)) {
    return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
  }
  if (targetId === userId) {
    return NextResponse.json({ message: "You cannot block yourself" }, { status: 400 });
  }

  const db = await new MongoDBClient().init();
  const target = await db.users().findOne({ _id: new ObjectId(targetId) }, { projection: { _id: 1 } });
  if (!target) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  await blockUser(userId, targetId);
  return NextResponse.json({ success: true, blocked: true });
}

export async function DELETE(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const targetId = await resolveTargetUserId(request);
  if (!targetId) {
    return NextResponse.json({ message: "Missing user id" }, { status: 400 });
  }

  await unblockUser(userId, targetId);
  return NextResponse.json({ success: true, blocked: false });
}
