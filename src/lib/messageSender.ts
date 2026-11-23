import { ObjectId } from "mongodb";

import type { MongoDBClient } from "@/lib/mongodb";
import { type Account, mergeSender, type MessageSender } from "@/lib/senderProfile";

export { mergeSender, storedSender } from "@/lib/senderProfile";

/** Returns the messages with each sender filled in from the user's current account. */
export async function withSenders<T extends { sender?: { id: string } & Partial<MessageSender> }>(
  db: MongoDBClient,
  messages: T[]
): Promise<T[]> {
  const ids = Array.from(
    new Set(messages.map((m) => m.sender?.id).filter((id): id is string => !!id && ObjectId.isValid(id)))
  );
  const accounts = new Map<string, Account>();
  if (ids.length > 0) {
    const users = await db
      .users()
      .find(
        { _id: { $in: ids.map((id) => new ObjectId(id)) } },
        { projection: { name: 1, firstname: 1, lastname: 1, username: 1, displayPicture: 1, verified: 1 } }
      )
      .toArray();
    for (const user of users) accounts.set(String(user._id), user as unknown as Account);
  }
  return messages.map((message) =>
    message.sender?.id ? { ...message, sender: mergeSender(message.sender, accounts.get(message.sender.id)) } : message
  );
}
