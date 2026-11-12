import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { isPushConfigured, sendPushToUserIds, type PushPayload } from "@/lib/push";

const MAX_USER_IDS = 500;

function isAuthorized(request: Request): boolean {
  const expected = process.env.PUSH_INTERNAL_SECRET;
  const provided = request.headers.get("x-push-secret");

  if (!expected || !provided) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

function parsePayload(value: unknown): PushPayload | null {
  if (!value || typeof value !== "object") return null;

  const payload = value as Record<string, unknown>;
  if (typeof payload.title !== "string" || typeof payload.body !== "string") return null;

  return {
    title: payload.title,
    body: payload.body,
    url: typeof payload.url === "string" ? payload.url : undefined,
    icon: typeof payload.icon === "string" ? payload.icon : undefined,
    badge: typeof payload.badge === "string" ? payload.badge : undefined,
    tag: typeof payload.tag === "string" ? payload.tag : undefined,
    data:
      payload.data && typeof payload.data === "object"
        ? (payload.data as Record<string, unknown>)
        : undefined,
  };
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      { message: "Push notifications are not configured" },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const payload = parsePayload(body?.payload);
  const userIds = Array.isArray(body?.userIds)
    ? body.userIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  if (!payload || userIds.length === 0 || userIds.length > MAX_USER_IDS) {
    return NextResponse.json({ message: "Invalid push request" }, { status: 400 });
  }

  const result = await sendPushToUserIds(userIds, payload);
  return NextResponse.json(result);
}
