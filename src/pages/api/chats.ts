import { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { ChatAttributes, ChatSettings } from '@/lib/types/type';

const MONGODB_URI = process.env.MONGOLINK;
const MONGODB_DB = 'mydb';

function generateRandom16DigitNumber(): number {
  let randomNumber = '';
  for (let i = 0; i < 16; i++) {
      randomNumber += Math.floor(Math.random() * 10).toString();
  }
  return parseInt(randomNumber, 10);
}

const client = new MongoClient(MONGODB_URI!);

export const chatRepository = {
  getAllChats: async (_req: NextApiRequest, res: NextApiResponse<ChatAttributes[] | { error: string }>) => {
    try {
      await client.connect();
      const chats = await client.db(MONGODB_DB).collection('chats').find({}).toArray();
      // Map MongoDB documents to ChatAttributes
      const formattedChats: ChatAttributes[] = chats.map(chat => ({
        id: chat.id,
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
      }));

      res.status(200).json(formattedChats);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch chats' });
    } finally {
      await client.close();
    }
  },

  getChatById: async (req: NextApiRequest, res: NextApiResponse<ChatAttributes | { error: string }>) => {
    try {
      await client.connect();
      const { id } = req.query;
      const chat = await client.db(MONGODB_DB).collection('chats').findOne({ _id: new ObjectId(id as string) });
      if (chat) {
        // Map the MongoDB document to ChatAttributes
        const formattedChat: ChatAttributes = {
          id: chat.id,
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
    } finally {
      await client.close();
    }
  },

  createChat: async (req: NextApiRequest, res: NextApiResponse<ChatAttributes>) => {
    try {
      await client.connect();
      const chatData: Omit<ChatAttributes, 'id'> = req.body;
      
      // Remove the 'id' field if it exists in the request body
      delete (chatData as any).id;
      const formattedChat: ChatAttributes = {
        id: generateRandom16DigitNumber(),
        name: chatData.name || '',
        lastMessage: chatData.lastMessage || '',
        timestamp: chatData.timestamp ? new Date(chatData.timestamp).toISOString() : new Date().toISOString(),
        unread: Boolean(chatData.unread),
        chatId: chatData.chatId,
        chatType: chatData.chatType as 'Chats' | 'Groups' | 'Channels',
        participants: chatData.participants || [],
        chatSettings: chatData.chatSettings,
        messageId: chatData.messageId,
        senderId: chatData.senderId,
        messageContent: chatData.messageContent,
        messageType: chatData.messageType,
        isRead: chatData.isRead,
        reactions: chatData.reactions || [],
        attachments: chatData.attachments || [],
        favorite: Boolean(chatData.favorite),
        pinned: Boolean(chatData.pinned),
        deleted: Boolean(chatData.deleted),
        archived: Boolean(chatData.archived),
        lastUpdated: chatData.lastUpdated ? new Date(chatData.lastUpdated).toISOString() : new Date().toISOString(),
      };

      const result = await client.db(MONGODB_DB).collection('chats').insertOne(formattedChat);
      

      res.status(201).json(formattedChat);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create chat' } as any);
    } finally {
      await client.close();
    }
  },

  updateChat: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await client.connect();
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
    } finally {
      await client.close();
    }
  },

  updateChatSettings: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await client.connect();
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
    } finally {
      await client.close();
    }
  },

  deleteChat: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await client.connect();
      const { id } = req.query;
      await client.db(MONGODB_DB).collection('chats').deleteOne({ _id: new ObjectId(id as string) });
      await client.db(MONGODB_DB).collection('chatSettings').deleteOne({ _id: new ObjectId(id as string) });
      res.status(204).end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete chat' });
    } finally {
      await client.close();
    }
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
        if (req.query.id) {
            return chatRepository.getChatById(req, res);
        } else {
            return chatRepository.getAllChats(req, res);
        }
    case 'POST':
        return chatRepository.createChat(req, res);
    case 'PUT':
        return chatRepository.updateChat(req, res);
    case 'DELETE':
        return chatRepository.deleteChat(req, res);
    default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
  }

}