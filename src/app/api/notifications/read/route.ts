import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { getUnreadCount, markAllRead } from "@/lib/notifications";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { before?: unknown } | null;
    const requested = typeof body?.before === "string" ? new Date(body.before) : new Date();
    const now = new Date();
    const before = Number.isNaN(requested.getTime()) || requested > now ? now : requested;

    const db = await new MongoDBClient().init();
    const modified = await markAllRead(db, userId, before);
    const unreadCount = await getUnreadCount(db, userId);

    return NextResponse.json({ success: true, modified, unreadCount });
  } catch (error) {
    console.error("[api/notifications/read] POST failed:", error);
    return NextResponse.json({ message: "Failed to update notifications" }, { status: 500 });
  }
}
