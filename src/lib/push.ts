import { ObjectId } from "mongodb";
import webpush, { type PushSubscription } from "web-push";

import { MongoDBClient } from "@/lib/mongodb";
import type { PushSubscriptionSchema } from "@/lib/types/type";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface BrowserPushSubscriptionInput {
  endpoint?: unknown;
  expirationTime?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
}

export interface BrowserPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushSendResult {
  sent: number;
  failed: number;
  skipped: boolean;
}

const DEFAULT_ICON = "/notifications.png";
const DEFAULT_BADGE = "/badge.png";
const PUSH_TTL_SECONDS = 24 * 60 * 60;
const MAX_USER_IDS_PER_SEND = 500;

let vapidConfigured = false;

function configureVapid(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:noreply.noow@gmail.com",
    publicKey,
    privateKey
  );
  vapidConfigured = true;
  return true;
}

export function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function normalizeBrowserSubscription(input: unknown): BrowserPushSubscription | null {
  if (!input || typeof input !== "object") return null;

  const candidate = input as BrowserPushSubscriptionInput;
  const endpoint = typeof candidate.endpoint === "string" ? candidate.endpoint.trim() : "";
  const p256dh = typeof candidate.keys?.p256dh === "string" ? candidate.keys.p256dh : "";
  const auth = typeof candidate.keys?.auth === "string" ? candidate.keys.auth : "";

  if (!endpoint.startsWith("https://") || !p256dh || !auth) return null;

  const expirationTime =
    typeof candidate.expirationTime === "number" && Number.isFinite(candidate.expirationTime)
      ? candidate.expirationTime
      : null;

  return { endpoint, expirationTime, keys: { p256dh, auth } };
}

function normalizePayload(payload: PushPayload): PushPayload {
  return {
    title: payload.title.trim().slice(0, 120) || "Velo",
    body: payload.body.trim().slice(0, 240),
    url: payload.url,
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_BADGE,
    tag: payload.tag,
    data: payload.data,
  };
}

export async function ensurePushIndexes(db: MongoDBClient): Promise<void> {
  await Promise.all([
    db.pushSubscriptions().createIndex({ endpoint: 1 }, { unique: true }),
    db.pushSubscriptions().createIndex({ userId: 1 }),
  ]);
}

export async function savePushSubscription(
  userId: string,
  subscription: BrowserPushSubscription,
  userAgent: string
): Promise<void> {
  const db = await new MongoDBClient().init();
  await ensurePushIndexes(db);

  const now = new Date().toISOString();
  await db.pushSubscriptions().updateOne(
    { endpoint: subscription.endpoint },
    {
      $set: {
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        expirationTime: subscription.expirationTime,
        userAgent: userAgent.slice(0, 500),
        updatedAt: now,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        createdAt: now,
      },
    },
    { upsert: true }
  );
}

export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  const db = await new MongoDBClient().init();
  await db.pushSubscriptions().deleteOne({ userId, endpoint });
}

function toWebPushSubscription(
  subscription: Pick<PushSubscriptionSchema, "endpoint" | "keys" | "expirationTime">
): PushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    expirationTime: subscription.expirationTime,
  };
}

function isGone(error: unknown): boolean {
  const statusCode = (error as { statusCode?: number } | null)?.statusCode;
  return statusCode === 404 || statusCode === 410;
}

export async function sendPushToUserIds(
  userIds: string[],
  payload: PushPayload
): Promise<PushSendResult> {
  const uniqueUserIds = Array.from(
    new Set(userIds.filter((id): id is string => typeof id === "string" && id.length > 0))
  ).slice(0, MAX_USER_IDS_PER_SEND);

  if (uniqueUserIds.length === 0 || !configureVapid()) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const db = await new MongoDBClient().init();
  const subscriptions = await db
    .pushSubscriptions()
    .find({ userId: { $in: uniqueUserIds } })
    .toArray();

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, skipped: false };
  }

  const message = JSON.stringify(normalizePayload(payload));

  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(toWebPushSubscription(subscription), message, {
          TTL: PUSH_TTL_SECONDS,
        });
        return true;
      } catch (error) {
        if (isGone(error)) {
          await db.pushSubscriptions().deleteOne({ _id: subscription._id });
        }
        throw error;
      }
    })
  );

  let sent = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === "fulfilled") sent += 1;
    else failed += 1;
  }

  return { sent, failed, skipped: false };
}

export async function sendPushToUserId(
  userId: string,
  payload: PushPayload
): Promise<PushSendResult> {
  return sendPushToUserIds([userId], payload);
}
