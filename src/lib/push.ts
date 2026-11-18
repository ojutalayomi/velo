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
  action?: "close";
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
  pruned: number;
  skipped: boolean;
}

const DEFAULT_ICON = "/notifications.png";
const DEFAULT_BADGE = "/badge.png";
const DEFAULT_URL = "/notifications";
const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 240;
const MAX_PAYLOAD_BYTES = 3500;
const TAG_PATTERN = /^[A-Za-z0-9:_-]{1,128}$/;
const PUSH_TTL_SECONDS = 24 * 60 * 60;
const MAX_USER_IDS_PER_SEND = 500;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [250, 750, 1500];
const MAX_CONCURRENT_SENDS = 50;

let configuredSignature = "";

function configureVapid(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  const signature = `${publicKey}:${privateKey}`;
  if (signature !== configuredSignature) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:noreply.noow@gmail.com",
      publicKey,
      privateKey
    );
    configuredSignature = signature;
  }
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

export function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";

  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\p{Cc}\u007f]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeUrl(value: unknown, fallback = DEFAULT_URL): string {
  if (typeof value !== "string") return fallback;

  const raw = value.trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (/[\\\p{Cc}\u007f]/u.test(raw)) return fallback;

  try {
    const parsed = new URL(raw, "https://velo.local");
    if (parsed.origin !== "https://velo.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function sanitizeTag(value: unknown): string | undefined {
  return typeof value === "string" && TAG_PATTERN.test(value) ? value : undefined;
}

function serializedSize(payload: PushPayload): number {
  return Buffer.byteLength(JSON.stringify(payload), "utf8");
}

function trimToPayloadLimit(payload: PushPayload): PushPayload {
  if (serializedSize(payload) <= MAX_PAYLOAD_BYTES) return payload;

  const trimmed: PushPayload = { ...payload };

  delete trimmed.data;
  if (serializedSize(trimmed) <= MAX_PAYLOAD_BYTES) return trimmed;

  trimmed.body = trimmed.body.slice(0, 120);
  if (serializedSize(trimmed) <= MAX_PAYLOAD_BYTES) return trimmed;

  trimmed.body = "";
  if (serializedSize(trimmed) <= MAX_PAYLOAD_BYTES) return trimmed;

  trimmed.title = trimmed.title.slice(0, 40);
  return trimmed;
}

export function normalizePayload(payload: PushPayload): PushPayload {
  const isClose = payload.action === "close";
  const data =
    payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? { ...payload.data }
      : undefined;

  if (data) delete data.url;

  return trimToPayloadLimit({
    title: isClose ? "" : normalizeText(payload.title, MAX_TITLE_LENGTH) || "Velo",
    body: isClose ? "" : normalizeText(payload.body, MAX_BODY_LENGTH),
    url: sanitizeUrl(payload.url),
    icon: sanitizeUrl(payload.icon, DEFAULT_ICON),
    badge: sanitizeUrl(payload.badge, DEFAULT_BADGE),
    tag: sanitizeTag(payload.tag),
    action: isClose ? "close" : undefined,
    data,
  });
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

function getStatusCode(error: unknown): number | undefined {
  const statusCode = (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof statusCode === "number" ? statusCode : undefined;
}

function isGone(error: unknown): boolean {
  const statusCode = getStatusCode(error);
  return statusCode === 404 || statusCode === 410;
}

function shouldRetry(error: unknown): boolean {
  const statusCode = getStatusCode(error);
  if (statusCode === undefined) return true;
  if (statusCode === 429) return true;
  return statusCode >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SendOutcome = "sent" | "failed" | "pruned";

async function sendWithRetry(
  subscription: PushSubscriptionSchema,
  message: string
): Promise<SendOutcome> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      await webpush.sendNotification(toWebPushSubscription(subscription), message, {
        TTL: PUSH_TTL_SECONDS,
      });
      return "sent";
    } catch (error) {
      if (isGone(error)) return "pruned";
      if (!shouldRetry(error) || attempt === MAX_ATTEMPTS - 1) return "failed";

      const baseDelay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
      const jitter = Math.floor(Math.random() * 100);
      await sleep(baseDelay + jitter);
    }
  }

  return "failed";
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function sendPushToUserIds(
  userIds: string[],
  payload: PushPayload
): Promise<PushSendResult> {
  const uniqueUserIds = Array.from(
    new Set(userIds.filter((id): id is string => typeof id === "string" && id.length > 0))
  ).slice(0, MAX_USER_IDS_PER_SEND);

  if (uniqueUserIds.length === 0 || !configureVapid()) {
    return { sent: 0, failed: 0, pruned: 0, skipped: true };
  }

  const db = await new MongoDBClient().init();
  const subscriptions = await db
    .pushSubscriptions()
    .find({ userId: { $in: uniqueUserIds } })
    .toArray();

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, pruned: 0, skipped: false };
  }

  const message = JSON.stringify(normalizePayload(payload));
  const outcomes = await mapWithConcurrency(
    subscriptions,
    MAX_CONCURRENT_SENDS,
    async (subscription) => {
      const outcome = await sendWithRetry(subscription, message);
      if (outcome === "pruned") {
        await db.pushSubscriptions().deleteOne({ _id: subscription._id });
      }
      return outcome;
    }
  );

  let sent = 0;
  let failed = 0;
  let pruned = 0;
  for (const outcome of outcomes) {
    if (outcome === "sent") sent += 1;
    else if (outcome === "pruned") pruned += 1;
    else failed += 1;
  }

  return { sent, failed, pruned, skipped: false };
}

export async function sendPushToUserId(
  userId: string,
  payload: PushPayload
): Promise<PushSendResult> {
  return sendPushToUserIds([userId], payload);
}
