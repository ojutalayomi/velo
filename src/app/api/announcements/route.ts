import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";

/** Returns the newest active, unexpired announcement (or null) for signed-in users. */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const db = await new MongoDBClient().init();
    const now = new Date().toISOString();
    const item = await db
      .announcements()
      .findOne(
        { active: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { sort: { _id: -1 } }
      );
    return NextResponse.json({
      data: item
        ? { id: String(item._id), title: item.title, message: item.message, url: item.url ?? null }
        : null,
    });
  } catch (error) {
    console.error("[api/announcements] GET failed:", error);
    return NextResponse.json({ message: "Failed to load announcement" }, { status: 500 });
  }
}
