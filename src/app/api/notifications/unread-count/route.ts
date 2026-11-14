import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { getUnreadCount } from "@/lib/notifications";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await new MongoDBClient().init();
    const unreadCount = await getUnreadCount(db, userId);
    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error("[api/notifications/unread-count] GET failed:", error);
    return NextResponse.json({ message: "Failed to load unread count" }, { status: 500 });
  }
}
