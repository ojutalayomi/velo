import { isBotAccount } from "@/lib/botAccount";
import { ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { ensureChatDmIndex, isChatMember, isDuplicateKeyError } from "@/lib/chatMembership";
import { UserSchema } from "@/lib/class/User";
import { DEFAULT_MESSAGE_LIMIT, pagingMeta, parsePaging } from "@/lib/apiPagination";
import { MongoDBClient } from "@/lib/mongodb";
import { emitSequenceViaSocketServer, emitViaSocketServer } from "@/lib/socket";
import {
  AllChats,
  ChatDataClient,
  ChatParticipant,
  ChatType,
  MessageAttributes,
  MessageSchema,
  NewChat,
  NewChat_,
  NewChatSettings,
} from "@/lib/types/type";
import { parseSince } from "@/lib/chatSync";
import { buildMessageFilter } from "@/lib/chatSyncServer";
import { dmKeyFor } from "@/lib/dmKey";
import { storedSender, withSenders } from "@/lib/messageSender";
import { canShowLastSeen } from "@/lib/userPrivacy";

interface Payload {
  _id: string;
  exp: number;
}

// Membership (adminIds) and the roster are deliberately not editable here.
const CHAT_FIELD_VALIDATORS: Record<string, (v: unknown) => boolean> = {
  groupDescription: (v) => typeof v === "string" && v.length <= 500,
  groupDisplayPicture: (v) => typeof v === "string" && v.length <= 500,
  isPrivate: (v) => typeof v === "boolean",
  onlyAdminsCanSend: (v) => typeof v === "boolean",
  name: (v) =>
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v).every((entry) => typeof entry === "string" && entry.length <= 100),
};

// Connected on the first request rather than at import, so the module can be imported (and tested)
// without a top-level await. Everything below runs only after the handler has called `ensureDb()`.
let db: MongoDBClient;
let dbReady: Promise<MongoDBClient> | undefined;
const ensureDb = async () => {
  dbReady ??= new MongoDBClient().init();
  try {
    db = await dbReady;
  } catch (error) {
    dbReady = undefined; // a failed connect must not stay cached forever
    throw error;
  }
};

const func = async (_id: string): Promise<UserSchema | null> => {
  const objectId = ObjectId.isValid(_id) ? new ObjectId(_id) : _id;
  const user = await db.users().findOne({ _id: objectId as ObjectId });
  return user as UserSchema;
};

/** Builds the client-facing chat object (DM display names and pictures resolved). */
const buildChatCopy = async (
  chat: { _id: ObjectId | string; name?: Record<string, string>; chatType: string } & Record<string, any>,
  participants: ChatParticipant[],
  callerId: string
): Promise<ChatDataClient> => {
  const chatCopy = {
    ...chat,
    _id: chat._id.toString(),
    name: { ...(chat.name ?? {}) },
    participants: participants.map((participant) => ({ ...participant })),
  } as unknown as ChatDataClient;

  if (chatCopy.chatType === "DM" && chatCopy.participants.length === 2) {
    delete chatCopy.name[chatCopy.participants.find((p) => p.userId === callerId)?.userId ?? ""];
  }

  await Promise.all(
    chatCopy.participants.map(async (participant, index) => {
      if (chatCopy.chatType === "DM" && participant.userId !== callerId) {
        const user = await func(participant.userId);
        chatCopy.name[participant.userId] = user?.name ?? "";
        chatCopy.participants[index].displayPicture = user?.displayPicture ?? "";
        chatCopy.participants[index].isBot = isBotAccount(user);
        if (await canShowLastSeen(participant.userId)) {
          const lastSeen = (user as { lastSeen?: string } | null)?.lastSeen;
          if (lastSeen) chatCopy.timestamp = new Date(lastSeen).toISOString();
        } else {
          chatCopy.lastSeenHidden = true;
        }
      }
    })
  );

  return chatCopy;
};

/**
 * Announces a new chat and delivers its first message over one acknowledged connection.
 * Bounded well under the platform's 10s function limit (cold start + DB work come first), so a
 * slow socket server can never outlast the API route; resolves to whether
 * everything was delivered, which the client uses to decide on a fallback.
 */
const announceNewChat = async (
  callerId: string,
  chatId: string,
  msg: MessageAttributes | undefined
): Promise<boolean> => {
  try {
    await emitSequenceViaSocketServer(
      callerId,
      [
        { event: "addChat", payload: { chat: { _id: chatId } } },
        ...(msg ? [{ event: "chatMessage" as const, payload: { ...msg } }] : []),
      ],
      { connectTimeoutMs: 2_500, ackTimeoutMs: 2_500, totalTimeoutMs: 4_000 }
    );
    return true;
  } catch (error) {
    console.error("Failed to announce the new chat:", error);
    return false;
  }
};

export const chatRepository = {
  getAllChats: async (
    req: NextApiRequest,
    res: NextApiResponse<AllChats | { error: string }>,
    payload: Payload
  ) => {
    try {
      const participantList = await db.chatParticipants().find({ userId: payload._id }).toArray();
      const chatIds = participantList.map((chat) => chat.chatId);

      const chats = await db
        .chats()
        .find({ _id: { $in: chatIds.map((id) => new ObjectId(id)) } })
        .toArray();

      const allParticipants = await db
        .chatParticipants()
        .find({ chatId: { $in: chatIds } })
        .toArray();

      const msgPaging = parsePaging(req, {
        skipKey: "messageSkip",
        limitKey: "messageLimit",
        defaultLimit: DEFAULT_MESSAGE_LIMIT,
        maxLimit: 2000,
      });
      const fetchMessageCount = msgPaging.limit + 1;

      // Taken before any query runs, so anything written while we read is re-sent next time.
      const serverTime = new Date().toISOString();
      const since = parseSince(req.query.since);

      const visibleToUser = {
        $or: [
          ...(chatIds.length > 0
            ? [
                {
                  chatId: {
                    $in: chatIds,
                  },
                },
              ]
            : []),
          { receiverId: payload._id },
        ],
      };

      const messageFilter = await buildMessageFilter(db, visibleToUser, chatIds, since);

      const messageDocs = await db
        .chatMessages()
        .find(messageFilter)
        .sort({ timestamp: -1, _id: -1 })
        .skip(msgPaging.skip)
        .limit(fetchMessageCount)
        .toArray();

      const hasMoreMessages = messageDocs.length > msgPaging.limit;
      const messages = await withSenders(db, messageDocs.slice(0, msgPaging.limit));

      const readReceipts = await db
        .readReceipts()
        .find({ messageId: { $in: messages.map((message) => message._id?.toString()) } })
        .toArray();
      const reactions = await db
        .chatReactions()
        .find({ messageId: { $in: messages.map((message) => message._id?.toString()) } })
        .toArray();
      const attachments = await db
        .files()
        .find({ key: { $in: messages.map((message) => message.attachments).flat() } })
        .toArray();

      // Build a map of chatId -> chatType and chatId -> participants
      const chatTypeMap = new Map<string, ChatType>();
      const chatParticipantsMap = new Map<string, string[]>();
      chats.forEach((chat) => {
        chatTypeMap.set(chat._id.toString(), chat.chatType);
        chatParticipantsMap.set(
          chat._id.toString(),
          allParticipants.filter((p) => p.chatId === chat._id.toString()).map((p) => p.userId)
        );
      });

      messages.forEach((message) => {
        // Ensure isRead is always an object
        if (!message.isRead || typeof message.isRead !== "object") {
          message.isRead = {};
        }
        let chatId: string = "";
        if (typeof message.chatId === "string") {
          chatId = message.chatId;
        } else if (
          message.chatId &&
          typeof message.chatId === "object" &&
          typeof (message.chatId as any).toString === "function"
        ) {
          chatId = (message.chatId as any).toString();
        }
        const chatType = chatTypeMap.get(chatId) || "DM"; // fallback to DM if not found
        const participants = chatParticipantsMap.get(chatId) || [];

        if (chatType === "Personal") {
          // Only attach read receipt for the single participant
          const userId = participants[0];
          const receipt = readReceipts.find(
            (r) => r.messageId === message._id?.toString() && r.userId === userId
          );
          message.isRead = {};
          if (userId) {
            message.isRead[userId] = !!(receipt && receipt.readAt);
          }
        } else {
          // Attach all relevant read receipts
          readReceipts.forEach((receipt) => {
            if (receipt.messageId === message._id?.toString()) {
              if (!message.isRead) message.isRead = {};
              message.isRead[receipt.userId] = !!receipt.readAt;
            }
          });
        }
        message.reactions = reactions.filter(
          (reaction) => reaction.messageId === message._id?.toString()
        );
      });

      const newMessages = messages.map((message) => {
        const { viewOnceOpens, viewOnceDeleteAfter, ...rest } = message as typeof message & {
          viewOnceOpens?: Record<string, string>;
          viewOnceDeleteAfter?: string;
        };
        void viewOnceDeleteAfter;
        return {
          ...rest,
          _id: message._id.toString(),
          isRead: message.isRead || {},
          // A view once file is only ever given out by the socket server, one open at a time.
          ...(rest.viewOnce
            ? { attachments: [], viewOnceOpenedBy: Object.keys(viewOnceOpens ?? {}) }
            : {
                attachments: attachments.filter((attachment) =>
                  message.attachments.includes(attachment.key)
                ),
              }),
        };
      }) as MessageAttributes[];

      const newChatsPromises = chats.map(async (chat) => {
        try {
          const a = { ...chat } as unknown as ChatDataClient; // Create a copy to avoid modifying the original

          // console.log('Processing chat:', a._id);

          a.participants = await Promise.all(
            (allParticipants || [])
              .filter((participant) => participant.chatId === chat._id.toString())
              .map(async (participant) => {
                try {
                  let user = null;
                  if (a.chatType === "DM" || a.chatType === "Personal") {
                    user = await func(participant.userId);
                    if (a.chatType === "DM") {
                      // Set the name for the other participant
                      if (participant.userId !== payload._id) {
                        a.name[participant.userId] = user?.name ?? "";
                        // "Last seen" for a DM is the other person's last disconnect time.
                        if (await canShowLastSeen(participant.userId)) {
                          const lastSeen = (user as { lastSeen?: string } | null)?.lastSeen;
                          if (lastSeen) a.timestamp = new Date(lastSeen).toISOString();
                        } else {
                          a.lastSeenHidden = true;
                        }
                      }
                    }
                  } else if (a.chatType === "Group") {
                    user = await func(participant.userId); // Optional: fetch user info for group participants
                  }
                  return {
                    userId: participant.userId,
                    displayPicture: user?.displayPicture ?? participant.displayPicture ?? "",
                    // The chat screens show senders from here, so a rename or new photo applies
                    // to messages already on the device instead of staying frozen in the cache.
                    ...(user
                      ? {
                          name: user.name ?? "",
                          username: user.username ?? "",
                          verified: user.verified === true,
                        }
                      : {}),
                    ...(a.chatType === "DM" && participant.userId !== payload._id
                      ? { isBot: isBotAccount(user) }
                      : {}),
                    unreadCount: participant.unreadCount,
                    favorite: participant.favorite,
                    pinned: participant.pinned,
                    deleted: participant.deleted,
                    archived: participant.archived,
                    chatSettings: participant.chatSettings,
                    chatType: a.chatType,
                    chatId: a._id.toString(),
                    _id: participant._id,
                  } as ChatParticipant;
                } catch (error) {
                  console.error(`Error processing participant ${participant.userId}:`, error);
                  return participant;
                }
              })
          );

          // console.log('Processed chat:', a._id, 'Participants:', a.participants.length);
          return a;
        } catch (error) {
          console.error("Error processing chat:", chat._id, error);
          return null;
        }
      });

      const newChats = (await Promise.all(newChatsPromises)).filter((chat) => chat !== null);
      // console.log('Total processed chats:', newChats.length);

      const chatSettings = newChats.reduce(
        (acc, chat) => {
          if (
            chat &&
            chat.participants &&
            chat.participants.some((p) => p.userId === payload._id)
          ) {
            const participant = chat.participants.find((p) => p.userId === payload._id);
            acc[chat._id.toString()] = participant?.chatSettings as NewChatSettings;
          }
          return acc;
        },
        {} as { [key: string]: NewChatSettings }
      );

      const newObj = {
        chats: newChats,
        chatSettings,
        messages: newMessages,
        requestId: payload._id,
        serverTime,
        pagination: {
          messages: pagingMeta(msgPaging.skip, msgPaging.limit, hasMoreMessages),
        },
      };

      res.status(200).json(newObj);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch chats" });
    }
  },

  // Complete the logic later, now just return the chat data
  getChatById: async (
    req: NextApiRequest,
    res: NextApiResponse<ChatDataClient | { error: string }>,
    payload: Payload
  ) => {
    try {
      const { id } = req.query;
      if (typeof id !== "string" || !ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid chat id" });
      }
      if (!(await isChatMember(db, id, payload._id))) {
        return res.status(403).json({ error: "You are not a member of this chat" });
      }
      const chat = await db.chats().findOne({ _id: new ObjectId(id) });
      const chatParticipants = await db.chatParticipants().find({ chatId: id }).toArray();
      if (chat) {
        // Map the MongoDB document to ChatAttributes
        const formattedChat: ChatDataClient = {
          _id: chat._id.toString(),
          name: chat.name || "",
          chatType: chat.chatType as ChatType,
          participants: chatParticipants || [],
          groupDescription: chat.groupDescription || "",
          groupDisplayPicture: chat.groupDisplayPicture || "",
          verified: chat.verified || false,
          adminIds: chat.adminIds || [],
          isPrivate: chat.isPrivate || false,
          timestamp: chat.timestamp
            ? new Date(chat.timestamp).toISOString()
            : new Date().toISOString(),
          lastUpdated: chat.lastUpdated
            ? new Date(chat.lastUpdated).toISOString()
            : new Date().toISOString(),
          lastMessageId: chat.lastMessageId || "",
        };
        res.status(200).json(formattedChat);
      } else {
        res.status(404).json({ error: "Chat not found" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch chat" });
    }
  },

  getParticipants: async (
    req: NextApiRequest,
    res: NextApiResponse,
    payload: Payload
  ) => {
    try {
      const { chatId } = req.query;
      if (!chatId || typeof chatId !== 'string') {
        return res.status(400).json({ error: 'chatId is required' });
      }
      if (!(await isChatMember(db, chatId, payload._id))) {
        return res.status(403).json({ error: 'You are not a member of this chat' });
      }
      const participants = await db.chatParticipants().find({ chatId }).toArray();
      const userIds = participants.map(p => new ObjectId(p.userId));
      const users = await db.users().find({ _id: { $in: userIds } }).toArray();
      const userMap = new Map(users.map(u => [u._id.toString(), u]));
      const result = participants.map(p => {
        const user = userMap.get(p.userId);
        return {
          userId: p.userId,
          username: user?.username ?? '',
          name: user?.name ?? '',
          displayPicture: user?.displayPicture ?? '',
        };
      }).filter(p => p.username !== '');
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch participants' });
    }
  },

  createChat: async (
    req: NextApiRequest,
    res: NextApiResponse<NewChat_ | { error: string }>,
    payload: Payload
  ) => {
    try {
      const chatData: NewChat & { msg: MessageAttributes } = req.body;
      // The creator is always a member, regardless of what the client sent.
      const memberIds = Array.from(new Set([payload._id, ...(chatData.participants ?? [])]));

      const newID = new ObjectId(chatData._id) || new ObjectId();

      // Reuse a chat that already exists instead of creating another: either this very id (a lost
      // response, a double click) or, for a DM, the existing DM between the same two people. The
      // first message is re-addressed to the reused chat; the client follows the returned id.
      const respondWithExisting = async (existing: { _id: ObjectId } & Record<string, any>) => {
        const existingId = existing._id.toString();
        const rows = await db.chatParticipants().find({ chatId: existingId }).toArray();
        const callerRow = rows.find((row) => row.userId === payload._id);
        if (!callerRow) return res.status(409).json({ error: "Chat id already in use" });

        const msg = chatData.msg ? { ...chatData.msg, chatId: existingId } : undefined;
        const announced = await announceNewChat(payload._id, existingId, msg);
        return res.status(200).json({
          chat: await buildChatCopy(existing as any, rows, payload._id),
          chatSettings: callerRow.chatSettings,
          requestId: payload._id,
          announced,
        } as any);
      };

      const existingChat = await db.chats().findOne({ _id: newID });
      if (existingChat) return respondWithExisting(existingChat);

      // Every participant must be a real user; a missing profile on the client otherwise
      // arrives here as the string "undefined" and creates a chat nobody can open.
      if (memberIds.some((memberId) => !ObjectId.isValid(memberId))) {
        return res.status(400).json({ error: "Invalid participant" });
      }
      const knownUsers = await db
        .users()
        .countDocuments({ _id: { $in: memberIds.map((memberId) => new ObjectId(memberId)) } });
      if (knownUsers !== memberIds.length) {
        return res.status(400).json({ error: "One or more participants do not exist" });
      }

      // One DM per pair: the stored pair key is authoritative; the roster join below also finds
      // DMs created before the key existed.
      const dmKey =
        chatData.chatType === "DM" && memberIds.length === 2
          ? dmKeyFor(memberIds[0], memberIds[1])
          : undefined;
      if (dmKey) {
        const byKey = await db.chats().findOne({ dmKey });
        if (byKey) return respondWithExisting(byKey);

        const otherId = memberIds.find((memberId) => memberId !== payload._id);
        const mine = await db
          .chatParticipants()
          .find({ userId: payload._id }, { projection: { chatId: 1 } })
          .toArray();
        const shared = otherId
          ? await db
              .chatParticipants()
              .find(
                { userId: otherId, chatId: { $in: mine.map((row) => row.chatId) } },
                { projection: { chatId: 1 } }
              )
              .toArray()
          : [];
        const existingDm = shared.length
          ? await db.chats().findOne({
              _id: { $in: shared.map((row) => new ObjectId(row.chatId)) },
              chatType: "DM",
            })
          : null;
        if (existingDm) return respondWithExisting(existingDm);
      }

      // ChatSettings Collection
      const chatSettings: NewChatSettings = {
        _id: new ObjectId(),
        chatId: newID.toString(), // Reference to the chat in Chats collection
        // General settings
        isMuted: false,
        isPinned: false,
        isArchived: false,
        notificationSound: "", // Path to a sound file
        notificationVolume: 0, // Volume level (0-100)
        wallpaper: "", // Path to an image file
        theme: "light" as "light" | "dark",

        // Specific to group chats
        members: memberIds, // List of user IDs

        // Specific to direct messages
        isBlocked: false,
        lastSeen: new Date().toISOString(), // Timestamp of the last time the user was online
      };

      // Chats Collection
      // type is
      const chat = {
        _id: newID,
        name: chatData.name || {},
        chatType: chatData.chatType as ChatType,
        groupDescription: chatData.groupDescription || "",
        groupDisplayPicture: chatData.groupDisplayPicture || "",
        verified: false,
        adminIds: chatData.chatType === "Group" ? [payload._id] : memberIds,
        isPrivate: false,
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        lastMessageId: "",
        ...(dmKey ? { dmKey } : {}),
      };

      const participants: ChatParticipant[] = memberIds.map((participantId) => ({
        _id: new ObjectId(),
        unreadCount: chatData.unreadCounts?.[participantId] || 0,
        favorite: Boolean(chatData.favorite),
        pinned: Boolean(chatData.pinned),
        deleted: Boolean(chatData.deleted),
        archived: Boolean(chatData.archived),
        chatSettings,
        displayPicture: chatData.participantsImg?.[participantId] || "",
        userId: participantId,
        chatId: chat._id.toString(),
        chatType: chatData.chatType,
      }));

      if (dmKey) await ensureChatDmIndex(db);
      try {
        await db.chats().insertOne(chat);
      } catch (error) {
        // Lost a race with a simultaneous creation of the same DM: use the one that won.
        if (dmKey && isDuplicateKeyError(error)) {
          const winner = await db.chats().findOne({ dmKey });
          if (winner) return respondWithExisting(winner);
        }
        throw error;
      }
      await db.chatParticipants().insertMany(participants);
      // await db.collection('chatSettings').insertOne(chatSettings);

      const announced = await announceNewChat(payload._id, chat._id.toString(), chatData.msg);

      const newObj = {
        chat: await buildChatCopy(chat, participants, payload._id),
        chatSettings,
        requestId: payload._id,
        announced,
      };

      res.status(201).json(newObj);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create chat" } as any);
    }
  },

  updateChat: async (req: NextApiRequest, res: NextApiResponse, payload: Payload) => {
    try {
      const { id } = req.query;
      if (typeof id !== "string" || !ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid chat id" });
      }

      const body = req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({ error: "Invalid chat attributes" });
      }

      const $set: Record<string, unknown> = {};
      for (const [key, validate] of Object.entries(CHAT_FIELD_VALIDATORS)) {
        if (!(key in body)) continue;
        if (!validate(body[key])) {
          return res.status(400).json({ error: `Invalid value for ${key}` });
        }
        $set[key] = body[key];
      }
      if (Object.keys($set).length === 0) {
        return res.status(400).json({ error: "No valid chat attributes provided" });
      }

      const chat = await db.chats().findOne({ _id: new ObjectId(id) });
      if (!chat) return res.status(404).json({ error: "Chat not found" });
      if (!(await isChatMember(db, id, payload._id))) {
        return res.status(403).json({ error: "You are not a member of this chat" });
      }
      if (chat.chatType === "Group" && !chat.adminIds?.includes(payload._id)) {
        return res.status(403).json({ error: "Only group admins can edit this group" });
      }

      if (chat.chatType !== "Group") {
        return res.status(400).json({ error: "Only group details can be edited" });
      }
      if ("name" in $set) {
        // Groups store their title under `name.group`; no other keys are allowed.
        const name = $set.name as Record<string, string>;
        const title = typeof name.group === "string" ? name.group.trim() : "";
        if (Object.keys(name).some((key) => key !== "group") || !title) {
          return res.status(400).json({ error: "Group name cannot be empty" });
        }
        $set.name = { group: title };
      }
      if (typeof $set.groupDescription === "string") {
        $set.groupDescription = $set.groupDescription.trim();
      }

      await db.chats().updateOne({ _id: new ObjectId(id) }, { $set });

      // Post a notice in the thread when the posting rule actually changed.
      if (typeof $set.onlyAdminsCanSend === "boolean" && $set.onlyAdminsCanSend !== Boolean(chat.onlyAdminsCanSend)) {
        try {
          const actor = await db.users().findOne({ _id: new ObjectId(payload._id) });
          const notice = {
            _id: new ObjectId(),
            chatId: id,
            sender: storedSender({ id: payload._id }),
            receiverId: id,
            content: `${actor?.name || "An admin"} ${
              $set.onlyAdminsCanSend ? "changed this group so only admins can send messages" : "allowed all members to send messages"
            }`,
            timestamp: new Date().toISOString(),
            chatType: "Group",
            messageType: "Announcement",
            reactions: [],
            attachments: [],
            quotedMessageId: "",
            status: "sent",
          } as unknown as MessageSchema;
          await db.chatMessages().insertOne(notice);
          await emitViaSocketServer(payload._id, "chat:announce", { messageId: notice._id.toString() });
        } catch (error) {
          console.error("Failed to post the group-rule notice:", error);
        }
      }

      // Tell the other members so their screens (title, composer) update without a reload.
      try {
        await emitViaSocketServer(payload._id, "chat:updated", { chatId: id }, { totalTimeoutMs: 3_500 });
      } catch (error) {
        console.error("Failed to announce the group update:", error);
      }
      res.status(200).json($set);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update chat" });
    }
  },

  deleteChat: async (req: NextApiRequest, res: NextApiResponse, payload: Payload) => {
    try {
      const { id } = req.query;
      if (typeof id !== "string" || !ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid chat id" });
      }
      const chat = await db.chats().findOne({ _id: new ObjectId(id) });
      if (!chat) return res.status(404).json({ error: "Chat not found" });
      if (!(await isChatMember(db, id, payload._id))) {
        return res.status(403).json({ error: "You are not a member of this chat" });
      }
      if (chat.chatType === "Group" && !chat.adminIds?.includes(payload._id)) {
        return res.status(403).json({ error: "Only group admins can delete this group" });
      }
      await db.chats().deleteOne({ _id: new ObjectId(id) });
      res.status(204).json("");
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete chat" });
    }
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  await ensureDb();

  // Improved cookie extraction
  const rawCookie = req.cookies.velo_12;
  if (!rawCookie) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Clean the cookie value - only remove quotes if they exist at the beginning/end
  const cookie = rawCookie.replace(/^"|"$/g, "");

  // Additional validation
  if (!cookie || cookie.trim() === "") {
    return res.status(401).json({ error: "Invalid authentication token" });
  }

  const payload = (await verifyToken(cookie)) as unknown as Payload;
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  switch (method) {
    case "GET":
      if (req.query.participants) {
        return chatRepository.getParticipants(req, res, payload);
      } else if (req.query.id) {
        return chatRepository.getChatById(req, res, payload);
      } else {
        return chatRepository.getAllChats(req, res, payload);
      }
    case "POST":
      return chatRepository.createChat(req, res, payload);
    case "PUT":
      return chatRepository.updateChat(req, res, payload);
    case "DELETE":
      return chatRepository.deleteChat(req, res, payload);
    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
      return res.status(405).json(`Method ${method} Not Allowed`);
  }
}
