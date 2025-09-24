import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { AllChatsServer, ChatAttributes, ChatDataClient, ChatParticipant, ChatSettings, ChatType, Err, MessageAttributes, msgStatus, NewChat, NewChat_, NewChatSettings, Participant, UserSchema } from '@/lib/types/type';
import { verifyToken } from '@/lib/auth';
import { GroupMessageAttributes } from '../../lib/types/type';
import { MongoDBClient } from '@/lib/mongodb';
import { getSocketInstance } from '@/lib/socket';

function generateRandom16DigitNumber(): string {
  let randomNumber = '';
  for (let i = 0; i < 24; i++) {
    randomNumber += Math.floor(Math.random() * 10).toString();
  }
  return randomNumber;
}

interface Payload {
  _id: string,
  exp: number
}

const db = await new MongoDBClient().init();
      
const func = async (_id: string): Promise<UserSchema | null> => {
  const objectId = ObjectId.isValid(_id) ? new ObjectId(_id) : _id;
  const user = await db.users().findOne({ _id: objectId as ObjectId });
  return user as UserSchema;
}

export const chatRepository = {
  getAllChats: async (req: NextApiRequest, res: NextApiResponse<AllChatsServer | { error: string }>, payload: Payload) => {
    try {
      const participantList = await db.chatParticipants().find({ userId: payload._id }).toArray();
      const chatIds = participantList.map(chat => chat.chatId);
      
      const chats = await db.chats().find({ _id: { $in: chatIds.map(id => new ObjectId(id)) } }).toArray();

      const allParticipants = await db.chatParticipants().find({ chatId: { $in: chatIds } }).toArray();

      const messages = await db.chatMessages().find({
        $or: [
          ...(chatIds.length > 0 ? [
            { chatId: 
              { 
                $in: chatIds 
              } 
            }
          ] : []), // Use $in to get messages for all chatIds if the array isn't empty
          { senderId: payload._id }, // Direct sender ID match
          { receiverId: payload._id } // Match receiver ID
        ]
      }).toArray();

      const readReceipts = await db.readReceipts().find({ messageId: { $in: messages.map(message => message._id?.toString()) } }).toArray();
      const reactions = await db.chatReactions().find({ messageId: { $in: messages.map(message => message._id?.toString()) } }).toArray();
      
      // Build a map of chatId -> chatType and chatId -> participants
      const chatTypeMap = new Map<string, ChatType>();
      const chatParticipantsMap = new Map<string, string[]>();
      chats.forEach(chat => {
        chatTypeMap.set(chat._id.toString(), chat.chatType);
        chatParticipantsMap.set(
          chat._id.toString(),
          allParticipants.filter(p => p.chatId === chat._id.toString()).map(p => p.userId)
        );
      });

      messages.forEach(message => {
        // Ensure isRead is always an object
        if (!message.isRead || typeof message.isRead !== 'object') {
          message.isRead = {};
        }
        let chatId: string = '';
        if (typeof message.chatId === 'string') {
          chatId = message.chatId;
        } else if (message.chatId && typeof message.chatId === 'object' && typeof (message.chatId as any).toString === 'function') {
          chatId = (message.chatId as any).toString();
        }
        const chatType = chatTypeMap.get(chatId) || 'DMs'; // fallback to DMs if not found
        const participants = chatParticipantsMap.get(chatId) || [];

        if (chatType === 'Personal') {
          // Only attach read receipt for the single participant
          const userId = participants[0];
          const receipt = readReceipts.find(r => r.messageId === message._id?.toString() && r.userId === userId);
          message.isRead = {};
          if (userId) {
            message.isRead[userId] = !!(receipt && receipt.readAt);
          }
        } else {
          // Attach all relevant read receipts
          readReceipts.forEach(receipt => {
            if (receipt.messageId === message._id?.toString()) {
              if (!message.isRead) message.isRead = {};
              message.isRead[receipt.userId] = !!receipt.readAt;
            }
          });
        }
        message.reactions = reactions.filter(reaction => reaction.messageId === message._id?.toString());
      });

      const newMessages = messages.map(message => ({
        ...message,
        isRead: message.isRead || {},
        reactions: message.reactions || [],
      })) as (MessageAttributes & GroupMessageAttributes)[];
      
      const newChatsPromises = chats
      .map(async chat => {
        try {
          const a = { ...chat } as unknown as ChatDataClient; // Create a copy to avoid modifying the original
          
          // console.log('Processing chat:', a._id);

          a.participants = await Promise.all(
            (allParticipants || [])
              .filter(participant => participant.chatId === chat._id.toString())
              .map(async participant => {
                try {
                  let user = null;
                  if (a.chatType === 'DMs' || a.chatType === 'Personal') {
                    user = await func(participant.userId);
                    if (a.chatType === 'DMs') {
                      // Set the name for the other participant
                      if (participant.userId !== payload._id) {
                        a.name[participant.userId] = user?.name ?? '';
                      }
                    }
                  } else if (a.chatType === 'Groups') {
                    user = await func(participant.userId); // Optional: fetch user info for group participants
                  }
                  return {
                    userId: participant.userId,
                    displayPicture: user?.displayPicture ?? participant.displayPicture ?? '',
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
          console.error('Error processing chat:', chat._id, error);
          return null;
        }
      });

      const newChats = (await Promise.all(newChatsPromises)).filter(chat => chat !== null);
      // console.log('Total processed chats:', newChats.length);

      const chatSettings = newChats.reduce((acc, chat) => {
        if (chat && chat.participants && chat.participants.some((p) => p.userId === payload._id)) {
          const participant = chat.participants.find((p) => p.userId === payload._id);
          acc[chat._id.toString()] = participant?.chatSettings as NewChatSettings;
        }
        return acc;
      }, {} as { [key: string]: NewChatSettings });

      const newObj = {
        chats: newChats,
        chatSettings: chatSettings,
        messages: newMessages,
        requestId: payload._id
      }
      // console.log(newObj)


      res.status(200).json(newObj);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch chats' });
    }
  },

  getChatById: async (req: NextApiRequest, res: NextApiResponse<ChatDataClient | { error: string }>) => {
    try {
      const { id } = req.query;
      const chat = await db.chats().findOne({ _id: new ObjectId(id as string) });
      const chatParticipants = await db.chatParticipants().find({ chatId: id }).toArray();
      if (chat) {
        // Map the MongoDB document to ChatAttributes
        const formattedChat: ChatDataClient = {
          _id: chat._id,
          name: chat.name || '',
          chatType: chat.chatType as ChatType,
          participants: chatParticipants || [],
          groupDescription: chat.groupDescription || '',
          groupDisplayPicture: chat.groupDisplayPicture || '',
          verified: chat.verified || false,
          adminIds: chat.adminIds || [],
          inviteLink: chat.inviteLink || '',
          isPrivate: chat.isPrivate || false,
          timestamp: chat.timestamp ? new Date(chat.timestamp).toISOString() : new Date().toISOString(),
          lastUpdated: chat.lastUpdated ? new Date(chat.lastUpdated).toISOString() : new Date().toISOString(),
          lastMessageId: chat.lastMessageId || '',
        };
        res.status(200).json(formattedChat);
      } else {
        res.status(404).json({ error: 'Chat not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch chat' });
    }
  },

  createChat: async (req: NextApiRequest, res: NextApiResponse<NewChat_ | { error: string }>, payload: Payload) => {
    try {
      const chatData: Omit<NewChat, 'id'> & { msg: MessageAttributes } = req.body;

      const newID = new ObjectId(chatData._id) || new ObjectId(generateRandom16DigitNumber());
      // ChatSettings Collection
      const chatSettings: NewChatSettings = {
        _id: new ObjectId(generateRandom16DigitNumber()),
        chatId: newID.toString(), // Reference to the chat in Chats collection
        // General settings
        isMuted: false,
        isPinned: false,
        isArchived: false,
        notificationSound: '',// Path to a sound file
        notificationVolume: 0, // Volume level (0-100)
        wallpaper: '', // Path to an image file
        theme: 'light' as 'light' | 'dark',
      
        // Specific to group chats
        members: chatData.participants, // List of user IDs
      
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
        groupDescription: chatData.groupDescription || '',
        groupDisplayPicture: chatData.groupDisplayPicture || '',
        verified: false,
        adminIds: chatData.participants, // List of admin user IDs
        isPrivate: false,
        inviteLink: chatData.chatType === 'Groups' ? `/invite/${newID.toString()}` : '',
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        lastMessageId: '',
      };

      const participants: ChatParticipant[] = chatData.participants.map(participantId => ({
        _id: new ObjectId(),
        unreadCount: chatData.unreadCounts?.[participantId] || 0,
        favorite: Boolean(chatData.favorite),
        pinned: Boolean(chatData.pinned),
        deleted: Boolean(chatData.deleted),
        archived: Boolean(chatData.archived),
        chatSettings: chatSettings,
        displayPicture: chatData.participantsImg?.[participantId] || '',
        userId: participantId,
        chatId: chat._id.toString(),
        chatType: chatData.chatType,
      }));

      await db.chats().insertOne(chat);
      await db.chatParticipants().insertMany(participants);
      // await db.collection('chatSettings').insertOne(chatSettings);

      const newObj = {
        chat: await (async () => {
          const chatCopy: ChatDataClient = { ...chat, _id: chat._id, participants: participants};
          // delete (chatCopy as any)._id;
          
          if (chatCopy.chatType === 'DMs' && chatCopy.participants.length === 2) {
            delete chatCopy.name[chatCopy.participants.find(p => p.userId === payload._id)?.userId ?? '']
          }
          
          await Promise.all(chatCopy.participants.map(async (participant, index) => {
            if (chatCopy.chatType === 'DMs' && participant.userId !== payload._id) {
              const user = await func(participant.userId);
              chatCopy.name[participant.userId] = user?.name ?? '';
              chatCopy.participants[index].displayPicture = user?.displayPicture ?? '';
            }
          }));
          
          return chatCopy;
        })(),
        requestId: payload._id
      }
  
      // Emit the message via Socket.IO
      const socket = getSocketInstance(payload._id);
      if (socket) {
        try {
          socket.emit('chatMessage', {...chatData.msg, participants: participants});
          socket.emit('addChat', newObj)
          // console.log('Message emitted:', msg);
        } catch (error) {
          console.error('Socket emission error:', error);
          throw new Error('Failed to emit message');
        }
      }

      res.status(201).json(newObj);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create chat' } as any);
    }
  },

  updateChat: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { id } = req.query;
      const updatedAttributes: Partial<ChatDataClient> = req.body;
      await db.chats().updateOne(
        { _id: new ObjectId(id as string) },
        { $set: updatedAttributes }
      );
      res.status(200).end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update chat' });
    }
  },

  updateChatSettings: async (req: NextApiRequest, res: NextApiResponse, payload: Payload) => {
    try {
      const { id } = req.query;
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

      res.status(200).json('');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update chat settings' });
    }
  },

  deleteChat: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { id } = req.query;
      await db.chats().deleteOne({ _id: new ObjectId(id as string) });
      res.status(204).json('');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete chat' });
    }
  },

  addMessage: async (req: NextApiRequest, res: NextApiResponse<MessageAttributes | Err>) => {
    try {
      const { chatId } = req.query;
      const chatData: MessageAttributes = req.body;
      const chats = await db.chats().findOne({ _id: new ObjectId(chatId as string) });

      const newID = new ObjectId(generateRandom16DigitNumber());
      // Messages Collection
      const message = {
        _id: new ObjectId(chatData._id as string),
        chatId: chatId as string, // Reference to the chat in DMs collection
        senderId: chatData.senderId,
        receiverId: chatData.receiverId,
        content: chatData.content,
        timestamp: chatData.timestamp ? new Date(chatData.timestamp).toISOString() : new Date().toISOString(),
        messageType: chatData.messageType,
        isRead: {
          [chatData.senderId]: true,
          [chatData.receiverId]: false,
        }, // Object with participant IDs as keys and their read status as values
        reactions: chatData.reactions || [],
        attachments: chatData.attachments || [],
        quotedMessageId: '0',
        status: 'sent' as msgStatus,
      };
      await db.chats().updateOne(
        { _id: new ObjectId(message.chatId) },
        { $set: {
            lastMessageId: message._id.toString(),
            lastUpdated: new Date().toISOString()
          }
        }
      );
      await db.chatParticipants().updateOne(
        { chatId: message.chatId, userId: message.receiverId },
        { $inc: { unreadCount: 1 } }
      );
      await db.chatMessages().insertOne({
        ...message,
      });
      res.status(201).json(message);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to add message' });
    }
  },

  deleteMyMessage: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { chatId, messageId, userId, option } = req.query;
      await db.chatMessages().deleteOne({
        _id: new ObjectId(messageId as string),
        chatId: chatId as string,
        senderId: userId, // Assuming you have user authentication
      });
      res.status(200).json('Successfully deleted');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  },

  deleteMessageForMe: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { chatId, messageId, userId, option } = req.query;
      await db.chatMessages().updateOne(
        { _id: new ObjectId(messageId as string), chatId: chatId as string },
        { $set: { deletedFor: { $push: userId } } } // Assuming you have user authentication
      );
      res.status(200).json('Successfully deleted');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete message for you' });
    }
  },

  editMessage: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { chatId, messageId, userId } = req.query;
      const updatedContent = req.body.content;
      await db.chatMessages().updateOne(
        { _id: new ObjectId(messageId as string), chatId: chatId as string, senderId: userId },
        { $set: { content: updatedContent } } // Assuming you have user authentication
      );
      res.status(200).json('success');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to edit message' });
    }
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : '').replace(/"/g, '');
  // if (!cookies) return res.status(405).end(`Not Allowed`);
  const payload = await verifyToken(cookie as unknown as string) as unknown as Payload;
  // console.log(payload)
  if (!payload) return res.status(401).json(`Not Allowed`);
  
  switch (method) {
    case 'GET':
        if (req.query.id) {
            return chatRepository.getChatById(req, res);
        } else {
            return chatRepository.getAllChats(req, res, payload);
        }
    case 'POST':
        if (req.query.chatId) {
          return chatRepository.addMessage(req, res);
        } else {
          return chatRepository.createChat(req, res, payload);
        }
    case 'PUT':
        if (req.query.messageId) {
          return chatRepository.editMessage(req, res);
        } else {
          return chatRepository.updateChat(req, res);
        }
    case 'DELETE':
        if (req.query.option === 'me') {
          return chatRepository.deleteMessageForMe(req, res);
        } else if (req.query.option === 'all') {
          return chatRepository.deleteMyMessage(req, res);
        } else {
          return chatRepository.deleteChat(req, res);
        }
    default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json(`Method ${method} Not Allowed`);
  }

}