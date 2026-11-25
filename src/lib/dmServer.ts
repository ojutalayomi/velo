import { ObjectId } from "mongodb";

import { ensureChatDmIndex, isDuplicateKeyError } from "@/lib/chatMembership";
import { dmKeyFor } from "@/lib/dmKey";
import { MongoDBClient } from "@/lib/mongodb";
import type { ChatParticipant, ChatType, NewChatSettings } from "@/lib/types/type";

/** The DM between two people, if there is one. The stored pair key wins; older DMs are found by roster. */
export async function findDmChatId(db: MongoDBClient, userId: string, otherId: string) {
  const dmKey = dmKeyFor(userId, otherId);
  const byKey = await db.chats().findOne({ dmKey }, { projection: { _id: 1 } });
  if (byKey) return byKey._id.toString();

  const mine = await db
    .chatParticipants()
    .find({ userId }, { projection: { chatId: 1 } })
    .toArray();
  const shared = mine.length
    ? await db
        .chatParticipants()
        .find(
          { userId: otherId, chatId: { $in: mine.map((row) => row.chatId) } },
          { projection: { chatId: 1 } }
        )
        .toArray()
    : [];
  const existing = shared.length
    ? await db
        .chats()
        .findOne(
          { _id: { $in: shared.map((row) => new ObjectId(row.chatId)) }, chatType: "DM" },
          { projection: { _id: 1 } }
        )
    : null;
  return existing ? existing._id.toString() : null;
}

/** The DM between two people, made if it doesn't exist yet. Mirrors what creating a chat stores. */
export async function findOrCreateDm(
  db: MongoDBClient,
  userId: string,
  otherId: string
): Promise<{ chatId: string; created: boolean } | null> {
  const found = await findDmChatId(db, userId, otherId);
  if (found) return { chatId: found, created: false };

  if (!ObjectId.isValid(userId) || !ObjectId.isValid(otherId)) return null;
  const users = await db
    .users()
    .find({ _id: { $in: [new ObjectId(userId), new ObjectId(otherId)] } })
    .project({ name: 1, displayPicture: 1 })
    .toArray();
  if (users.length !== 2) return null;
  const byId = new Map(users.map((user) => [user._id.toString(), user]));

  const dmKey = dmKeyFor(userId, otherId);
  const memberIds = [userId, otherId];
  const now = new Date().toISOString();
  const chatId = new ObjectId();
  const chatSettings: NewChatSettings = {
    _id: new ObjectId(),
    chatId: chatId.toString(),
    isMuted: false,
    isPinned: false,
    isArchived: false,
    notificationSound: "",
    notificationVolume: 0,
    wallpaper: "",
    theme: "light",
    members: memberIds,
    isBlocked: false,
    lastSeen: now,
  };

  await ensureChatDmIndex(db);
  const chat = {
    _id: chatId,
    name: {
      [userId]: String(byId.get(userId)?.name ?? ""),
      [otherId]: String(byId.get(otherId)?.name ?? ""),
    },
    chatType: "DM" as ChatType,
    groupDescription: "",
    groupDisplayPicture: "",
    verified: false,
    adminIds: memberIds,
    isPrivate: false,
    timestamp: now,
    lastUpdated: now,
    lastMessageId: "",
    dmKey,
  };
  try {
    await db.chats().insertOne(chat);
  } catch (error) {
    // Lost a race with a simultaneous creation of the same DM: use the one that won.
    if (isDuplicateKeyError(error)) {
      const winner = await db.chats().findOne({ dmKey }, { projection: { _id: 1 } });
      if (winner) return { chatId: winner._id.toString(), created: false };
    }
    throw error;
  }

  const participants: ChatParticipant[] = memberIds.map((participantId) => ({
    _id: new ObjectId(),
    unreadCount: 0,
    favorite: false,
    pinned: false,
    deleted: false,
    archived: false,
    chatSettings,
    displayPicture: String(byId.get(participantId)?.displayPicture ?? ""),
    userId: participantId,
    chatId: chatId.toString(),
    chatType: "DM" as ChatType,
  }));
  await db.chatParticipants().insertMany(participants);
  return { chatId: chatId.toString(), created: true };
}
