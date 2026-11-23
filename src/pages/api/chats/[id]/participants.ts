import { ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import {
  ensureChatParticipantIndexes,
  isChatMember,
  isDuplicateMemberError,
} from "@/lib/chatMembership";
import { mergeSender, storedSender } from "@/lib/messageSender";
import { MongoDBClient } from "@/lib/mongodb";
import { emitViaSocketServer } from "@/lib/socket";
import { ChatParticipant, MessageSchema, NewChatSettings } from "@/lib/types/type";

const MAX_MEMBERS_PER_REQUEST = 50;

type Chat = { _id: ObjectId; chatType: string; adminIds?: string[] };

const addMembers = async (
  db: MongoDBClient,
  chat: Chat,
  callerId: string,
  requestedIds: string[],
  res: NextApiResponse
) => {
  const id = chat._id.toString();
  if (!chat.adminIds?.includes(callerId)) {
    return res.status(403).json({ error: "Only group admins can add members" });
  }

  const existing = await db.chatParticipants().find({ chatId: id }).toArray();
  const existingIds = new Set(existing.map((participant) => participant.userId));
  const candidateIds = requestedIds.filter((userId) => !existingIds.has(userId));
  if (candidateIds.length === 0) {
    return res.status(200).json({ added: [], participants: existing });
  }

  const users = await db
    .users()
    .find({ _id: { $in: candidateIds.map((userId) => new ObjectId(userId)) } })
    .toArray();
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));
  const newIds = candidateIds.filter((userId) => userMap.has(userId));
  if (newIds.length === 0) {
    return res.status(400).json({ error: "None of the supplied users exist" });
  }

  const chatSettings: NewChatSettings = {
    _id: new ObjectId(),
    chatId: id,
    isMuted: false,
    isPinned: false,
    isArchived: false,
    notificationSound: "",
    notificationVolume: 0,
    wallpaper: "",
    theme: "light",
    members: [...existingIds, ...newIds],
    isBlocked: false,
    lastSeen: new Date().toISOString(),
  };

  const rows: ChatParticipant[] = newIds.map((userId) => ({
    _id: new ObjectId(),
    chatId: id,
    unreadCount: 0,
    favorite: false,
    pinned: false,
    deleted: false,
    archived: false,
    chatSettings,
    displayPicture: userMap.get(userId)?.displayPicture ?? "",
    userId,
    chatType: "Group",
  }));

  await ensureChatParticipantIndexes(db);
  try {
    await db.chatParticipants().insertMany(rows, { ordered: false });
  } catch (error) {
    if (!isDuplicateMemberError(error)) throw error;
  }

  // A concurrent request may have inserted some of these users first, so the roster is
  // re-read to report only the rows that actually exist.
  const participants = await db.chatParticipants().find({ chatId: id }).toArray();
  const added = participants.filter((participant) => newIds.includes(participant.userId));

  if (added.length > 0) {
    const adder = await db.users().findOne({ _id: new ObjectId(callerId) });
    const names = added.map((participant) => userMap.get(participant.userId)?.name || "Someone");
    const joined =
      names.length > 2
        ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
        : names.join(" and ");
    const announcement: MessageSchema = {
      _id: new ObjectId(),
      chatId: id,
      sender: storedSender({ id: callerId }),
      receiverId: id,
      content: `${adder?.name || "An admin"} added ${joined}`,
      timestamp: new Date().toISOString(),
      chatType: "Group",
      messageType: "Announcement",
      reactions: [],
      attachments: [],
      quotedMessageId: "",
      status: "sent",
    } as MessageSchema;
    try {
      await db.chatMessages().insertOne(announcement);
      await emitViaSocketServer(callerId, "chatMessage", {
        ...announcement,
        sender: mergeSender({ id: callerId }, adder),
        _id: announcement._id.toString(),
      });
    } catch (error) {
      console.error("Failed to post the member-added notice:", error);
    }
    try {
      await emitViaSocketServer(callerId, "chat:participantsAdded", {
        chatId: id,
        addedUserIds: added.map((participant) => participant.userId),
      });
    } catch (error) {
      // Members are already persisted; a missed realtime push is recovered on next fetch.
      console.error("Failed to announce new group members:", error);
    }
  }

  return res.status(201).json({ added, participants });
};

const removeMembers = async (
  db: MongoDBClient,
  chat: Chat,
  callerId: string,
  requestedIds: string[],
  res: NextApiResponse
) => {
  const id = chat._id.toString();
  const adminIds = chat.adminIds ?? [];
  const existing = await db.chatParticipants().find({ chatId: id }).toArray();
  const targets = requestedIds.filter((userId) =>
    existing.some((participant) => participant.userId === userId)
  );
  if (targets.length === 0) {
    return res
      .status(200)
      .json({ removed: [], participants: existing, adminIds, chatDeleted: false });
  }

  const others = targets.filter((userId) => userId !== callerId);
  if (others.length > 0) {
    if (!adminIds.includes(callerId)) {
      return res.status(403).json({ error: "Only group admins can remove members" });
    }
    if (others.some((userId) => adminIds.includes(userId))) {
      return res
        .status(403)
        .json({ error: "Admins cannot be removed; ask them to leave the group" });
    }
  }

  await db.chatParticipants().deleteMany({ chatId: id, userId: { $in: targets } });
  const participants = existing.filter((participant) => !targets.includes(participant.userId));

  let nextAdminIds = adminIds.filter((userId) =>
    participants.some((participant) => participant.userId === userId)
  );
  let chatDeleted = false;

  if (participants.length === 0) {
    await db.chatMessages().deleteMany({ chatId: id });
    await db.chats().deleteOne({ _id: chat._id });
    await db.chatInvites().deleteMany({ chatId: id });
    nextAdminIds = [];
    chatDeleted = true;
  } else {
    if (nextAdminIds.length === 0) {
      // ObjectIds sort chronologically, so the longest-standing member inherits the group.
      const successor = [...participants].sort((a, b) =>
        String(a._id).localeCompare(String(b._id))
      )[0];
      nextAdminIds = [successor.userId];
    }
    if (nextAdminIds.join(",") !== adminIds.join(",")) {
      await db.chats().updateOne({ _id: chat._id }, { $set: { adminIds: nextAdminIds } });
    }
  }

  try {
    await emitViaSocketServer(callerId, "chat:participantsRemoved", {
      chatId: id,
      removedUserIds: targets,
    });
  } catch (error) {
    console.error("Failed to announce removed group members:", error);
  }

  return res.status(200).json({
    removed: targets,
    participants,
    adminIds: nextAdminIds,
    chatDeleted,
  });
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.setHeader("Allow", ["POST", "DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const cookie = decodeURIComponent(req.cookies.velo_12 ?? "").replace(/"/g, "");
  if (!cookie) return res.status(401).json({ error: "Unauthorized" });

  const payload = await verifyToken(cookie);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });
  const callerId = String(payload._id);

  const { id } = req.query;
  if (typeof id !== "string" || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid chat id" });
  }

  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  if (!Array.isArray(body.userIds) || body.userIds.length === 0) {
    return res.status(400).json({ error: "userIds must be a non-empty array" });
  }
  if (body.userIds.length > MAX_MEMBERS_PER_REQUEST) {
    return res
      .status(400)
      .json({ error: `Cannot change more than ${MAX_MEMBERS_PER_REQUEST} members at once` });
  }

  const requestedIds = Array.from(new Set(body.userIds as unknown[])).map((value) =>
    typeof value === "string" ? value : ""
  );
  if (requestedIds.some((userId) => !ObjectId.isValid(userId))) {
    return res.status(400).json({ error: "userIds must contain valid user ids" });
  }

  try {
    const db = await new MongoDBClient().init();
    const chat = await db.chats().findOne({ _id: new ObjectId(id) });
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (chat.chatType !== "Group") {
      return res.status(400).json({ error: "Only group chats accept membership changes" });
    }
    if (!(await isChatMember(db, id, callerId))) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    return req.method === "POST"
      ? await addMembers(db, chat, callerId, requestedIds as string[], res)
      : await removeMembers(db, chat, callerId, requestedIds as string[], res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update group members" });
  }
};

export default handler;