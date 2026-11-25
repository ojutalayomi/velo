import { NextResponse } from "next/server";

import { createStatusForUser } from "@/lib/statusCreate";
import {
  ensureStatusIndexes,
  getAuthenticatedUserId,
  getStatusGroupsForUser,
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

    const created = await createStatusForUser(userId, await request.json().catch(() => ({})));
    if (!created) return NextResponse.json({ message: "Invalid status payload" }, { status: 400 });
    return NextResponse.json({ data: created.group ? [created.group] : [] }, { status: 201 });
  } catch (error) {
    console.error("[api/statuses] POST failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
