import { MongoDBClient } from "@/lib/mongodb";

export const PRIVACY_DEFAULTS = {
  twoFactorAuth: false,
  loginAlerts: true,
  showOnlineStatus: true,
  showLastSeen: true,
  showReadReceipts: true,
  showTypingStatus: true,
} as const;

export type PrivacySettings = { -readonly [K in keyof typeof PRIVACY_DEFAULTS]: boolean };
export const PRIVACY_KEYS = Object.keys(PRIVACY_DEFAULTS) as (keyof PrivacySettings)[];

/** Reads a user's saved privacy settings, falling back to the defaults. */
export async function getPrivacySettings(userId: string): Promise<PrivacySettings> {
  const db = await new MongoDBClient().init();
  const doc = (await db.userSettings().findOne({ userId })) as Record<string, unknown> | null;
  const out = { ...PRIVACY_DEFAULTS } as PrivacySettings;
  for (const key of PRIVACY_KEYS) {
    if (typeof doc?.[key] === "boolean") out[key] = doc[key] as boolean;
  }
  return out;
}

/** Whether other people may see this user's last seen time. */
export async function canShowLastSeen(userId: string): Promise<boolean> {
  return (await getPrivacySettings(userId)).showLastSeen;
}
