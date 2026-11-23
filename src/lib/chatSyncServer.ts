import { ObjectId } from "mongodb";

import { changedSinceFilter } from "@/lib/chatSync";
import type { MongoDBClient } from "@/lib/mongodb";

/**
 * Mongo filter for the messages `GET /api/chats` should return.
 *
 * Without `since` it is just `visibleToUser`. With `since`, it is narrowed to messages changed
 * after that moment: new, deleted (the placeholder row), reacted to, or read. Read receipts live in
 * their own collection, so the ones read since are looked up first and their messages included.
 */
export async function buildMessageFilter(
  db: MongoDBClient,
  visibleToUser: Record<string, unknown>,
  chatIds: string[],
  since: string | null
): Promise<Record<string, unknown>> {
  if (!since) return visibleToUser;

  const readSince = await db
    .readReceipts()
    .find({ chatId: { $in: chatIds }, readAt: { $gt: since } }, { projection: { messageId: 1 } })
    .toArray();
  const readIds = [...new Set(readSince.map((r) => r.messageId))]
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  return { $and: [visibleToUser, changedSinceFilter(since, readIds)] };
}
