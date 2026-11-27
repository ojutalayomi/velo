import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { getMutedUserIds, muteUser, unmuteUser } from "@/lib/mutes";

async function resolveTargetUserId(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("userId");
  if (fromQuery) return fromQuery.trim();

  const body = await request.json().catch(() => null);
  const fromBody = typeof body?.userId === "string" ? body.userId.trim() : "";
  return fromBody || null;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ mutedUserIds: await getMutedUserIds(userId) });
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
    return NextResponse.json({ message: "You cannot mute yourself" }, { status: 400 });
  }

  const db = await new MongoDBClient().init();
  const target = await db.users().findOne({ _id: new ObjectId(targetId) }, { projection: { _id: 1 } });
  if (!target) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  await muteUser(userId, targetId);
  return NextResponse.json({ success: true, muted: true });
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

  await unmuteUser(userId, targetId);
  return NextResponse.json({ success: true, muted: false });
}
