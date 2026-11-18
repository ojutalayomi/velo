import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { isPushConfigured, sendPushToUserId } from "@/lib/push";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      { message: "Push notifications are not configured" },
      { status: 503 }
    );
  }

  const result = await sendPushToUserId(userId, {
    title: "Velo notifications are on",
    body: "You will now receive updates even when Velo is closed.",
    url: "/notifications",
    tag: "test",
  });

  if (result.sent === 0 && result.failed === 0 && result.pruned === 0 && !result.skipped) {
    return NextResponse.json(
      { message: "No active push subscription was found. Enable notifications and try again." },
      { status: 404 }
    );
  }

  if (result.sent === 0) {
    return NextResponse.json(
      {
        message: "Could not deliver a test notification to this device.",
        ...result,
      },
      { status: 502 }
    );
  }

  return NextResponse.json(result);
}
