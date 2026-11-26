import { Db, MongoBulkWriteError, MongoClient } from "mongodb";

import { MongoDBClient } from "@/lib/mongodb";

export const CHAT_PARTICIPANT_INDEX_NAME = "unique_chat_user";
export const CHAT_DM_INDEX_NAME = "unique_dm_pair";

/** Membership is the existence of a Chat_Participants row for (chatId, userId). */
export async function isChatMember(db: MongoDBClient, chatId: string, userId: string) {
  const participant = await db
    .chatParticipants()
    .findOne({ chatId, userId }, { projection: { _id: 1 } });
  return Boolean(participant);
}

const indexPromises = new WeakMap<MongoClient, Map<string, Promise<void>>>();

/**
 * Pre-existing duplicate rows make this fail. Writes stay duplicate-safe without the
 * index, so a rejection is reported rather than propagated; run
 * src/scripts/migrations/add-chat-participants-index.ts to dedupe and build it.
 */
export async function ensureChatParticipantIndexes(wrapper: MongoDBClient): Promise<void> {
  const db: Db = await wrapper.getDb();
  let databases = indexPromises.get(db.client);
  if (!databases) {
    databases = new Map();
    indexPromises.set(db.client, databases);
  }
  const existing = databases.get(db.databaseName);
  if (existing) return existing;
  const pending = wrapper
    .chatParticipants()
    .createIndex({ chatId: 1, userId: 1 }, { unique: true, name: CHAT_PARTICIPANT_INDEX_NAME })
    .then(() => undefined)
    .catch((error: unknown) => {
      databases.delete(db.databaseName);
      console.error(
        "Could not create the unique Chat_Participants index; run src/scripts/migrations/add-chat-participants-index.ts:",
        error
      );
    });
  databases.set(db.databaseName, pending);
  return pending;
}

/** With the unique index in place, a concurrent insert of the same member is a no-op. */
export function isDuplicateMemberError(error: unknown): boolean {
  if (!(error instanceof MongoBulkWriteError)) return false;
  const writeErrors = Array.isArray(error.writeErrors)
    ? error.writeErrors
    : [error.writeErrors];
  return writeErrors.length > 0 && writeErrors.every((entry) => entry.code === 11000);
}

/** True when a single-document write failed because of a unique index (error code 11000). */
export function isDuplicateKeyError(error: unknown): boolean {
  return (error as { code?: number } | null)?.code === 11000;
}

const dmIndexPromises = new WeakMap<MongoClient, Map<string, Promise<void>>>();

/**
 * Unique index on `dmKey` so two DMs can never exist for the same pair. Only documents that
 * have a `dmKey` are covered, so DMs created before it existed (and any duplicates among them)
 * neither block the build nor are protected; creation still finds them through the roster
 * lookup. src/scripts/dedupe-dm-chats.ts merges those duplicates and backfills their `dmKey`.
 */
export async function ensureChatDmIndex(wrapper: MongoDBClient): Promise<void> {
  const db: Db = await wrapper.getDb();
  let databases = dmIndexPromises.get(db.client);
  if (!databases) {
    databases = new Map();
    dmIndexPromises.set(db.client, databases);
  }
  const existing = databases.get(db.databaseName);
  if (existing) return existing;
  const pending = wrapper
    .chats()
    .createIndex(
      { dmKey: 1 },
      { unique: true, name: CHAT_DM_INDEX_NAME, partialFilterExpression: { dmKey: { $type: "string" } } }
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      databases.delete(db.databaseName);
      console.error(
        "Could not create the unique DM pair index; run src/scripts/dedupe-dm-chats.ts:",
        error
      );
    });
  databases.set(db.databaseName, pending);
  return pending;
}
