import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import {
  getNotificationPreferences,
  parseNotificationPatch,
  updateNotificationPreferences,
} from "@/lib/notificationSettings";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const preferences = await getNotificationPreferences(userId);
  return NextResponse.json({ preferences });
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseNotificationPatch(body);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  const preferences = await updateNotificationPreferences(userId, parsed.patch);
  return NextResponse.json({ preferences });
}
