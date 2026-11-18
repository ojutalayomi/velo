import { createHash } from "node:crypto";

import { Db, MongoClient } from "mongodb";

import { MongoDBClient } from "@/lib/mongodb";
import { ChatInviteMetadata, ChatInviteSchema, InviteBlockReason } from "@/lib/types/type";
import { generateRandomToken } from "@/lib/utils";

export const INVITE_TOKEN_BYTES = 24;
export const DEFAULT_INVITE_HOURS = 24 * 7;
export const MAX_INVITE_HOURS = 24 * 30;
export const MAX_INVITE_USES = 1000;

const TOKEN_PATTERN = new RegExp(`^[0-9a-f]{${INVITE_TOKEN_BYTES * 2}}$`);

export function newInviteToken(): string {
  return generateRandomToken(INVITE_TOKEN_BYTES);
}

/** The raw token is never stored, so a database read cannot produce a working link. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isInviteToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}

export function inviteBlockReason(
  invite: ChatInviteSchema | null,
  now: Date = new Date()
): InviteBlockReason | null {
  if (!invite) return "not_found";
  if (invite.expiresAt.getTime() <= now.getTime()) return "expired";
  if (!invite.enabled) return "disabled";
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) return "full";
  return null;
}

export function inviteMetadata(invite: ChatInviteSchema | null): ChatInviteMetadata {
  return {
    exists: Boolean(invite),
    enabled: invite?.enabled ?? false,
    expiresAt: invite ? invite.expiresAt.toISOString() : null,
    maxUses: invite?.maxUses ?? null,
    uses: invite?.uses ?? 0,
  };
}

const indexPromises = new WeakMap<MongoClient, Map<string, Promise<void>>>();

export async function ensureChatInviteIndexes(wrapper: MongoDBClient): Promise<void> {
  const db: Db = await wrapper.getDb();
  let databases = indexPromises.get(db.client);
  if (!databases) {
    databases = new Map();
    indexPromises.set(db.client, databases);
  }
  const existing = databases.get(db.databaseName);
  if (existing) return existing;
  const invites = wrapper.chatInvites();
  const pending = Promise.all([
    invites.createIndex({ chatId: 1 }, { unique: true, name: "unique_invite_chat" }),
    invites.createIndex({ tokenHash: 1 }, { unique: true, name: "unique_invite_token" }),
    invites.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "invite_expiry" }),
  ])
    .then(() => undefined)
    .catch((error: unknown) => {
      databases.delete(db.databaseName);
      console.error("Could not create the Chat_Invites indexes:", error);
    });
  databases.set(db.databaseName, pending);
  return pending;
}

/**
 * Reserves one use in a single atomic write, so two people clicking the same link at the
 * cap cannot both get in. Null means the link is unusable or already full.
 */
export async function claimInviteSlot(
  db: MongoDBClient,
  tokenHash: string,
  now: Date = new Date()
): Promise<ChatInviteSchema | null> {
  return db.chatInvites().findOneAndUpdate(
    {
      tokenHash,
      enabled: true,
      expiresAt: { $gt: now },
      $or: [{ maxUses: null }, { $expr: { $lt: ["$uses", "$maxUses"] } }],
    },
    { $inc: { uses: 1 } },
    { returnDocument: "after" }
  );
}

/** Gives a reserved use back when the joiner turned out to be a member already. */
export async function refundInviteSlot(db: MongoDBClient, tokenHash: string): Promise<void> {
  await db.chatInvites().updateOne({ tokenHash }, { $inc: { uses: -1 } });
}