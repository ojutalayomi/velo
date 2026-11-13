import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { isPushConfigured, sendPushToUserIds, type PushPayload } from "@/lib/push";

const MAX_USER_IDS = 500;
const MAX_REQUEST_BYTES = 64 * 1024;

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
  if (payload.action !== undefined && payload.action !== "close") return null;

  const isClose = payload.action === "close";
  if (!isClose && (typeof payload.title !== "string" || typeof payload.body !== "string")) {
    return null;
  }
  if (isClose && typeof payload.tag !== "string") return null;

  return {
    title: isClose ? "" : (payload.title as string),
    body: isClose ? "" : (payload.body as string),
    url: typeof payload.url === "string" ? payload.url : undefined,
    icon: typeof payload.icon === "string" ? payload.icon : undefined,
    badge: typeof payload.badge === "string" ? payload.badge : undefined,
    tag: typeof payload.tag === "string" ? payload.tag : undefined,
    action: isClose ? "close" : undefined,
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

  const rawBody = await request.text().catch(() => "");
  if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
    return NextResponse.json({ message: "Request body too large" }, { status: 413 });
  }

  let body: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(rawBody);
    body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

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
