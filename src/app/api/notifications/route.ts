import { NextRequest, NextResponse } from "next/server";

import { pagingMeta, parsePaging } from "@/lib/apiPagination";
import { getSessionUserId } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { listNotificationGroups, parseNotificationTab } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tab = parseNotificationTab(searchParams.get("tab"));
    const { limit, skip } = parsePaging(
      { query: Object.fromEntries(searchParams.entries()) },
      { defaultLimit: 30 }
    );

    const db = await new MongoDBClient().init();
    const result = await listNotificationGroups(db, userId, { tab, skip, limit });

    return NextResponse.json({
      data: result.data,
      pagination: pagingMeta(skip, limit, result.hasMore),
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    console.error("[api/notifications] GET failed:", error);
    return NextResponse.json({ message: "Failed to load notifications" }, { status: 500 });
  }
}
