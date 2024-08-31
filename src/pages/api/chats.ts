import { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import { AllChats, ChatAttributes, ChatSettings, Err, MessageAttributes, NewChat, NewChatResponse, NewChatSettings } from '@/lib/types/type';
import { verifyToken } from '@/lib/auth';

const uri = process.env.MONGOLINK ? process.env.MONGOLINK : '';
let client: MongoClient;
const MONGODB_DB = 'mydb';

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

export const chatRepository = {
  getAllChats: async (req: NextApiRequest, res: NextApiResponse<AllChats | { error: string }>, payload: Payload) => {
    try {
      const chats = await client.db(MONGODB_DB).collection('chats').find({ participants: payload._id }).toArray();
      const messages = await client.db(MONGODB_DB).collection('chatMessages').find({ $or: [{ senderId: payload._id }, { receiverId: payload._id }] }).toArray() as unknown as MessageAttributes[];
      
      const func = async (_id: string) => {
        const user = await client.db(MONGODB_DB).collection('Users').findOne({ _id: new ObjectId(_id) });
        return user?.displayPicture;
      }

      const newChats = chats.map(chat => {
        const entries = Object.entries(chat);
        entries.pop();
        const a = Object.fromEntries(entries);
        for (let i = 0; i < a.participantsImg.length; i++) {
          a.participantsImg.participants[i] = func(a.participants[i]);
        };
        return a;
      }) as unknown as NewChat[];

      const chatSettings = chats.map(chat => (
        { chatSettings: chat.chatSettings }
      )) as unknown as NewChatSettings[];

      const newObj = {
        chats: newChats,
        chatSettings: chatSettings,
        messages: messages,
        requestId: payload._id
      }


      res.status(200).json(newObj);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch chats' });
    }
  },

  getChatById: async (req: NextApiRequest, res: NextApiResponse<ChatAttributes | { error: string }>) => {
    try {
      const { id } = req.query;
      const chat = await client.db(MONGODB_DB).collection('chats').findOne({ _id: new ObjectId(id as string) });
      if (chat) {
        // Map the MongoDB document to ChatAttributes
        const formattedChat: ChatAttributes = {
          _id: chat._id,
          name: chat.name || '',
          lastMessage: chat.lastMessage || '',
          timestamp: chat.timestamp ? new Date(chat.timestamp).toISOString() : new Date().toISOString(),
          unread: Boolean(chat.unread),
          chatId: chat.chatId,
          chatType: chat.chatType as 'Chats' | 'Groups' | 'Channels',
          participants: chat.participants || [],
          chatSettings: chat.chatSettings,
          messageId: chat.messageId,
          senderId: chat.senderId,
          messageContent: chat.messageContent,
          messageType: chat.messageType,
          isRead: chat.isRead,
          reactions: chat.reactions || [],
          attachments: chat.attachments || [],
          favorite: Boolean(chat.favorite),
          pinned: Boolean(chat.pinned),
          deleted: Boolean(chat.deleted),
          archived: Boolean(chat.archived),
          lastUpdated: chat.lastUpdated ? new Date(chat.lastUpdated).toISOString() : new Date().toISOString(),
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

  createChat: async (req: NextApiRequest, res: NextApiResponse<NewChatResponse>) => {
    try {
      const chatData: Omit<NewChat, 'id'> = req.body;

      const newID = new ObjectId(generateRandom16DigitNumber());
      // ChatSettings Collection
      const chatSettings: NewChatSettings = {
        _id: new ObjectId(generateRandom16DigitNumber()),
        chatId: newID, // Reference to the chat in Chats collection
        // General settings
        isMuted: false,
        isPinned: false,
        isArchived: false,
        notificationSound: '',// Path to a sound file
        notificationVolume: 0, // Volume level (0-100)
        wallpaper: '', // Path to an image file
        theme: 'light' as 'light' | 'dark',
      
        // Specific to group chats
        isPrivate: false,
        inviteLink: '',
        members: chatData.participants, // List of user IDs
        adminIds: [], // List of admin user IDs
      
        // Specific to direct messages
        isBlocked: false,
        lastSeen: new Date().toISOString(), // Timestamp of the last time the user was online
      };
     
      // Chats Collection
      const chat = {
        _id: newID,
        name: chatData.name || '',
        chatType: chatData.chatType as 'Chats' | 'Groups' | 'Channels',
        participants: chatData.participants || [],
        lastMessageId: chatData.lastMessageId, // Reference to the last message in Messages collection
        unreadCounts: chatData.unreadCounts, // Object with participant IDs as keys and their unread counts as values
        favorite: Boolean(chatData.favorite),
        pinned: Boolean(chatData.pinned),
        deleted: Boolean(chatData.deleted),
        archived: Boolean(chatData.archived),
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        chatSettings: chatSettings,
      };

      await client.db(MONGODB_DB).collection('chats').insertOne(chat);
      // await client.db(MONGODB_DB).collection('chatSettings').insertOne(chatSettings);

      delete (chatSettings as any)._id;
      const formattedChat = {
        _id: chat._id,
        name: chat.name || '',
        lastMessageId: chatData.lastMessageId || '',
        timestamp: new Date().toISOString(),
        unreadCounts: chatData.unreadCounts,
        chatType: chatData.chatType as 'Chats' | 'Groups' | 'Channels',
        participants: chatData.participants || [],
        chatSettings: chat.chatSettings,
        lastUpdated: chat.lastUpdated,
      };

      res.status(201).json(formattedChat);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create chat' } as any);
    }
  },

  updateChat: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { id } = req.query;
      const updatedAttributes: Partial<ChatAttributes> = req.body;
      await client.db(MONGODB_DB).collection('chats').updateOne(
        { _id: new ObjectId(id as string) },
        { $set: updatedAttributes }
      );
      res.status(200).end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update chat' });
    }
  },

  updateChatSettings: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { id } = req.query;
      const updatedSettings: Partial<ChatSettings> = req.body;
      await client.db(MONGODB_DB).collection('chatSettings').updateOne(
        { _id: new ObjectId(id as string) },
        { $set: updatedSettings },
        { upsert: true }
      );
      res.status(200).end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update chat settings' });
    }
  },

  deleteChat: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { id } = req.query;
      await client.db(MONGODB_DB).collection('chats').deleteOne({ _id: new ObjectId(id as string) });
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
      const chats = await client.db(MONGODB_DB).collection('chats').findOne({ _id: new ObjectId(chatId as string) });

      const newID = new ObjectId(generateRandom16DigitNumber());
      // Messages Collection
      const message = {
        _id: newID,
        chatId: new ObjectId(chatId as string), // Reference to the chat in Chats collection
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
      };
      await client.db(MONGODB_DB).collection('chats').updateOne(
        { _id: message.chatId },
        { $set: {
          lastMessageId: message._id,
          unreadCounts: {
            [message.receiverId]: chats?.participants[message.receiverId] + 1,
          }}
        }
      );
      await client.db(MONGODB_DB).collection('chatMessages').insertOne({
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
      await client.db(MONGODB_DB).collection('chatMessages').deleteOne({
        _id: new ObjectId(messageId as string),
        chatId: new ObjectId(chatId as string),
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
      await client.db(MONGODB_DB).collection('chatMessages').updateOne(
        { _id: new ObjectId(messageId as string), chatId: new ObjectId(chatId as string) },
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
      await client.db(MONGODB_DB).collection('messages').updateOne(
        { _id: new ObjectId(messageId as string), chatId: new ObjectId(chatId as string), senderId: userId },
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
  if (!client) {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
      },
      connectTimeoutMS: 60000,
      maxPoolSize: 10
    });
    await client.connect();
    console.log("Mongoconnection: You successfully connected to MongoDB!");
  }
  
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
          return chatRepository.createChat(req, res);
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