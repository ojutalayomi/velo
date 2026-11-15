import { Db, MongoBulkWriteError, MongoClient } from "mongodb";

import { MongoDBClient } from "@/lib/mongodb";

export const CHAT_PARTICIPANT_INDEX_NAME = "unique_chat_user";

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
 * scripts/add-chat-participants-index.ts to dedupe and build it.
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
        "Could not create the unique Chat_Participants index; run scripts/add-chat-participants-index.ts:",
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