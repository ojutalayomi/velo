import { ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { isChatMember } from "@/lib/chatMembership";
import { UserSchema } from "@/lib/class/User";
import { DEFAULT_MESSAGE_LIMIT, pagingMeta, parsePaging } from "@/lib/apiPagination";
import { MongoDBClient } from "@/lib/mongodb";
import { canSendMessage } from "@/lib/chatPermissions";
import { emitViaSocketServer } from "@/lib/socket";
import {
  AllChats,
  ChatDataClient,
  ChatParticipant,
  ChatType,
  Err,
  MessageAttributes,
  msgStatus,
  NewChat,
  NewChat_,
  NewChatSettings,
} from "@/lib/types/type";

function generateRandom16DigitNumber(): string {
  let randomNumber = "";
  for (let i = 0; i < 24; i++) {
    randomNumber += Math.floor(Math.random() * 10).toString();
  }
  return randomNumber;
}

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

const db = await new MongoDBClient().init();

const func = async (_id: string): Promise<UserSchema | null> => {
  const objectId = ObjectId.isValid(_id) ? new ObjectId(_id) : _id;
  const user = await db.users().findOne({ _id: objectId as ObjectId });
  return user as UserSchema;
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

      const messageDocs = await db
        .chatMessages()
        .find({
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
            { senderId: payload._id },
            { receiverId: payload._id },
          ],
        })
        .sort({ timestamp: -1, _id: -1 })
        .skip(msgPaging.skip)
        .limit(fetchMessageCount)
        .toArray();

      const hasMoreMessages = messageDocs.length > msgPaging.limit;
      const messages = messageDocs.slice(0, msgPaging.limit);

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

      const newMessages = messages.map((message) => ({
        ...message,
        _id: message._id.toString(),
        isRead: message.isRead || {},
        attachments: attachments.filter((attachment) =>
          message.attachments.includes(attachment.key)
        ),
      })) as MessageAttributes[];

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
                      }
                    }
                  } else if (a.chatType === "Group") {
                    user = await func(participant.userId); // Optional: fetch user info for group participants
                  }
                  return {
                    userId: participant.userId,
                    displayPicture: user?.displayPicture ?? participant.displayPicture ?? "",
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

      await db.chats().insertOne(chat);
      await db.chatParticipants().insertMany(participants);
      // await db.collection('chatSettings').insertOne(chatSettings);

      const newObj = {
        chat: await (async () => {
          const chatCopy: ChatDataClient = { ...chat, _id: chat._id.toString(), participants };
          // delete (chatCopy as any)._id;

          if (chatCopy.chatType === "DM" && chatCopy.participants.length === 2) {
            delete chatCopy.name[
              chatCopy.participants.find((p) => p.userId === payload._id)?.userId ?? ""
            ];
          }

          await Promise.all(
            chatCopy.participants.map(async (participant, index) => {
              if (chatCopy.chatType === "DM" && participant.userId !== payload._id) {
                const user = await func(participant.userId);
                chatCopy.name[participant.userId] = user?.name ?? "";
                chatCopy.participants[index].displayPicture = user?.displayPicture ?? "";
              }
            })
          );

          return chatCopy;
        })(),
        chatSettings,
        requestId: payload._id,
      };

      // Announce the chat, then deliver its first message. The chat is already persisted, so a
      // failed announcement is logged instead of failing the request; recipients still get it
      // on their next fetch. Each emit waits for the socket server's ack because a
      // fire-and-forget emit can be lost when this serverless function exits.
      try {
        await emitViaSocketServer(payload._id, "addChat", { chat: { _id: chat._id.toString() } });
        await emitViaSocketServer(payload._id, "chatMessage", { ...chatData.msg });
      } catch (error) {
        console.error("Failed to announce the new chat:", error);
      }

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

      // Tell the other members so their screens (title, composer) update without a reload.
      try {
        await emitViaSocketServer(payload._id, "chat:updated", { chatId: id });
      } catch (error) {
        console.error("Failed to announce the group update:", error);
      }
      res.status(200).json($set);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update chat" });
    }
  },

  updateChatSettings: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // const { id } = req.query;
      // const updatedSettings: Partial<ChatSettings> = req.body;
      // const updateObject: { [key: string]: any } = {};

      // // Create a proper update object
      // Object.keys(updatedSettings).forEach(key => {
      //   updateObject[`participants.$[elem].chatSettings.${key}`] = updatedSettings[key as keyof ChatSettings];
      // });

      // await db.chats().updateOne(
      //   { _id: new ObjectId(id as string) },
      //   { $set: updateObject },
      //   {
      //     arrayFilters: [{ "elem.id": payload._id }],
      //     upsert: true
      //   }
      // );

      // // Fetch the updated chat to return the new settings
      // const updatedChat = await db.chats().findOne(
      //   { _id: new ObjectId(id as string) },
      //   { projection: { "participants.$[elem].chatSettings": 1 } }
      // );

      // const updatedChatSettings = updatedChat?.participants.find((p) => p.userId === payload._id)?.chatSettings;

      res.status(200).json("");
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update chat settings" });
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

  addMessage: async (
    req: NextApiRequest,
    res: NextApiResponse<MessageAttributes | Err>,
    payload: Payload
  ) => {
    try {
      const { chatId } = req.query;
      const chatData: MessageAttributes = req.body;
      if (typeof chatId !== "string" || !ObjectId.isValid(chatId)) {
        return res.status(400).json({ error: "Invalid chat id" });
      }
      const chats = await db.chats().findOne({ _id: new ObjectId(chatId) });
      if (
        chats &&
        !canSendMessage({
          chatType: chats.chatType,
          onlyAdminsCanSend: chats.onlyAdminsCanSend,
          adminIds: chats.adminIds,
          userId: payload._id,
        })
      ) {
        return res.status(403).json({ error: "Only admins can send messages in this group" });
      }

      if (!chats) {
        return res.status(404).json({ error: "Chat not found" });
      }
      if (!(await isChatMember(db, chatId, payload._id))) {
        return res.status(403).json({ error: "You are not a member of this chat" });
      }
      if (chatData.sender?.id !== payload._id) {
        return res.status(403).json({ error: "Sender does not match the authenticated user" });
      }

      // Messages Collection
      const message = {
        _id: new ObjectId(chatData._id as string),
        chatId: chatId as string, // Reference to the chat in DM collection
        sender: chatData.sender,
        receiverId: chatData.receiverId,
        content: chatData.content,
        timestamp: chatData.timestamp
          ? new Date(chatData.timestamp).toISOString()
          : new Date().toISOString(),
        chatType: chatData.chatType,
        messageType: chatData.messageType,
        isRead: {
          [chatData.sender.id]: true,
          [chatData.receiverId]: false,
        }, // Object with participant IDs as keys and their read status as values
        reactions: chatData.reactions || [],
        attachments: chatData.attachments || [],
        quotedMessageId: "0",
        status: "sent" as msgStatus,
      };
      await db.chats().updateOne(
        { _id: new ObjectId(message.chatId) },
        {
          $set: {
            lastMessageId: message._id.toString(),
            lastUpdated: new Date().toISOString(),
          },
        }
      );
      await db
        .chatParticipants()
        .updateOne(
          { chatId: message.chatId, userId: message.receiverId },
          { $inc: { unreadCount: 1 } }
        );
      if (chatData.attachments.length > 0) {
        await db.files().insertMany(
          chatData.attachments.map((attachment) => ({
            _id: new ObjectId(generateRandom16DigitNumber()),
            key: attachment.key,
            name: attachment.name,
            type: attachment.type,
            url: attachment.url || "",
            size: attachment.size || 0,
            uploadedAt: attachment.lastModified || new Date().toISOString(),
          }))
        );
      }
      await db.chatMessages().insertOne({
        ...message,
        attachments: chatData.attachments.map((attachment) => attachment.key),
      });
      res.status(201).json({ ...message, _id: message._id.toString() });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to add message" });
    }
  },

  deleteMyMessage: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { chatId, messageId, userId } = req.query;
      await db.chatMessages().deleteOne({
        _id: new ObjectId(messageId as string),
        chatId: chatId as string,
        senderId: userId, // Assuming you have user authentication
      });
      res.status(200).json("Successfully deleted");
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  },

  deleteMessageForMe: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { chatId, messageId, userId } = req.query;
      await db.chatMessages().updateOne(
        { _id: new ObjectId(messageId as string), chatId: chatId as string },
        { $set: { deletedFor: { $push: userId } } } // Assuming you have user authentication
      );
      res.status(200).json("Successfully deleted");
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete message for you" });
    }
  },

  editMessage: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { chatId, messageId, userId } = req.query;
      const updatedContent = req.body.content;
      await db.chatMessages().updateOne(
        { _id: new ObjectId(messageId as string), chatId: chatId as string, "sender.id": userId },
        { $set: { content: updatedContent } } // Assuming you have user authentication
      );
      res.status(200).json("success");
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to edit message" });
    }
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

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
      if (req.query.chatId) {
        return chatRepository.addMessage(req, res, payload);
      } else {
        return chatRepository.createChat(req, res, payload);
      }
    case "PUT":
      if (req.query.messageId) {
        return chatRepository.editMessage(req, res);
      } else {
        return chatRepository.updateChat(req, res, payload);
      }
    case "DELETE":
      if (req.query.option === "me") {
        return chatRepository.deleteMessageForMe(req, res);
      } else if (req.query.option === "all") {
        return chatRepository.deleteMyMessage(req, res);
      } else {
        return chatRepository.deleteChat(req, res, payload);
      }
    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
      return res.status(405).json(`Method ${method} Not Allowed`);
  }
}
