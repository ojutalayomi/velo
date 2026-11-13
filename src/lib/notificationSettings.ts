import { MongoDBClient } from "@/lib/mongodb";
import type { DndWindow, NotificationPreferences } from "@/lib/types/type";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  messages: true,
  mentions: true,
  follows: true,
  calls: true,
  dnd: {
    enabled: false,
    start: "22:00",
    end: "08:00",
    timezone: "UTC",
  },
  hideMessagePreview: false,
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const BOOLEAN_KEYS = ["messages", "mentions", "follows", "calls", "hideMessagePreview"] as const;

export type NotificationPreferencesPatch = Partial<
  Omit<NotificationPreferences, "dnd">
> & {
  dnd?: Partial<DndWindow>;
};

type ParseResult =
  | { ok: true; patch: NotificationPreferencesPatch }
  | { ok: false; message: string };

export function isValidTimeOfDay(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

export function isValidTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;

  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function mergeNotificationPreferences(raw: unknown): NotificationPreferences {
  const candidate =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const rawDnd =
    candidate.dnd && typeof candidate.dnd === "object" && !Array.isArray(candidate.dnd)
      ? (candidate.dnd as Record<string, unknown>)
      : {};

  return {
    messages: typeof candidate.messages === "boolean" ? candidate.messages : true,
    mentions: typeof candidate.mentions === "boolean" ? candidate.mentions : true,
    follows: typeof candidate.follows === "boolean" ? candidate.follows : true,
    calls: typeof candidate.calls === "boolean" ? candidate.calls : true,
    hideMessagePreview:
      typeof candidate.hideMessagePreview === "boolean" ? candidate.hideMessagePreview : false,
    dnd: {
      enabled: typeof rawDnd.enabled === "boolean" ? rawDnd.enabled : false,
      start: isValidTimeOfDay(rawDnd.start) ? rawDnd.start : DEFAULT_NOTIFICATION_PREFERENCES.dnd.start,
      end: isValidTimeOfDay(rawDnd.end) ? rawDnd.end : DEFAULT_NOTIFICATION_PREFERENCES.dnd.end,
      timezone: isValidTimezone(rawDnd.timezone)
        ? rawDnd.timezone
        : DEFAULT_NOTIFICATION_PREFERENCES.dnd.timezone,
    },
  };
}

function minutesInZone(now: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isWithinQuietHours(now: Date, dnd: DndWindow): boolean {
  if (!dnd.enabled || !isValidTimeOfDay(dnd.start) || !isValidTimeOfDay(dnd.end)) {
    return false;
  }

  const start = toMinutes(dnd.start);
  const end = toMinutes(dnd.end);
  if (start === end) return false;

  const current = minutesInZone(now, isValidTimezone(dnd.timezone) ? dnd.timezone : "UTC");
  return start < end ? current >= start && current < end : current >= start || current < end;
}

export function parseNotificationPatch(raw: unknown): ParseResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, message: "Invalid notification settings payload" };
  }

  const input = raw as Record<string, unknown>;
  const patch: NotificationPreferencesPatch = {};

  for (const key of BOOLEAN_KEYS) {
    if (!(key in input)) continue;
    if (typeof input[key] !== "boolean") {
      return { ok: false, message: `${key} must be a boolean` };
    }
    patch[key] = input[key] as boolean;
  }

  if ("dnd" in input) {
    const dnd = input.dnd;
    if (!dnd || typeof dnd !== "object" || Array.isArray(dnd)) {
      return { ok: false, message: "dnd must be an object" };
    }

    const value = dnd as Record<string, unknown>;
    const dndPatch: Partial<DndWindow> = {};

    if ("enabled" in value) {
      if (typeof value.enabled !== "boolean") {
        return { ok: false, message: "dnd.enabled must be a boolean" };
      }
      dndPatch.enabled = value.enabled;
    }
    if ("start" in value) {
      if (!isValidTimeOfDay(value.start)) {
        return { ok: false, message: "dnd.start must be HH:mm" };
      }
      dndPatch.start = value.start;
    }
    if ("end" in value) {
      if (!isValidTimeOfDay(value.end)) {
        return { ok: false, message: "dnd.end must be HH:mm" };
      }
      dndPatch.end = value.end;
    }
    if ("timezone" in value) {
      if (!isValidTimezone(value.timezone)) {
        return { ok: false, message: "dnd.timezone must be a valid IANA time zone" };
      }
      dndPatch.timezone = value.timezone;
    }

    patch.dnd = dndPatch;
  }

  return { ok: true, patch };
}

export async function ensureNotificationIndexes(db: MongoDBClient): Promise<void> {
  try {
    await db.userSettings().createIndex({ userId: 1 }, { unique: true });
  } catch (error) {
    console.error("Failed to create User_Settings index:", error);
  }
}

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const db = await new MongoDBClient().init();
  const settings = await db.userSettings().findOne({ userId });
  return mergeNotificationPreferences(settings?.notifications);
}

export async function updateNotificationPreferences(
  userId: string,
  patch: NotificationPreferencesPatch
): Promise<NotificationPreferences> {
  const db = await new MongoDBClient().init();
  await ensureNotificationIndexes(db);

  const set: Record<string, unknown> = {};
  for (const key of BOOLEAN_KEYS) {
    if (key in patch) set[`notifications.${key}`] = patch[key];
  }
  if (patch.dnd) {
    for (const key of ["enabled", "start", "end", "timezone"] as const) {
      if (key in patch.dnd) set[`notifications.dnd.${key}`] = patch.dnd[key];
    }
  }

  if (Object.keys(set).length > 0) {
    await db.userSettings().updateOne(
      { userId },
      { $set: set, $setOnInsert: { userId } },
      { upsert: true }
    );
  }

  return getNotificationPreferences(userId);
}
