import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { normalizeBrowserSubscription, removePushSubscription, savePushSubscription } from "@/lib/push";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const subscription = normalizeBrowserSubscription(body?.subscription);

  if (!subscription) {
    return NextResponse.json({ message: "Invalid push subscription" }, { status: 400 });
  }

  await savePushSubscription(userId, subscription, request.headers.get("user-agent") ?? "");

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";

  if (!endpoint) {
    return NextResponse.json({ message: "Missing subscription endpoint" }, { status: 400 });
  }

  await removePushSubscription(userId, endpoint);

  return NextResponse.json({ success: true });
}
