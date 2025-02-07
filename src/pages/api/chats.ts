import { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import { AllChats, ChatAttributes, ChatData, ChatSettings, Err, MessageAttributes, msgStatus, NewChat, NewChat_, NewChatResponse, NewChatSettings, Participant } from '@/lib/types/type';
import { verifyToken } from '@/lib/auth';
import { GroupMessageAttributes } from '../../lib/types/type';

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
      
const func = async (_id: string): Promise<any> => {
  const objectId = ObjectId.isValid(_id) ? new ObjectId(_id) : _id;
  const user = await client.db(MONGODB_DB).collection('Users').findOne({ _id: objectId as ObjectId });
  return user;
}

export const chatRepository = {
  getAllChats: async (req: NextApiRequest, res: NextApiResponse<AllChats | { error: string }>, payload: Payload) => {
    try {
      const chats = await client.db(MONGODB_DB).collection('chats').find({ 'participants.id': payload._id }).toArray();

      // Extract chatIds from the fetched chats
      const chatIds = chats.filter(chat => chat.chatType === "Groups").map(chat => chat._id);

      const messages = await client.db(MONGODB_DB).collection('chatMessages').find({
        $or: [
          ...(chatIds.length > 0 ? [{ chatId: { $in: chatIds } }] : []), // Use $in to get messages for all chatIds if the array isn't empty
          { senderId: payload._id }, // Direct sender ID match
          { receiverId: payload._id } // Match receiver ID
        ]
      }).toArray() as (MessageAttributes | GroupMessageAttributes)[];
      
      const newChatsPromises = chats
      .filter(chat => chat.participants.some((p: Participant) => p.id === payload._id))
      .map(async chat => {
        try {
          const a = { ...chat }; // Create a copy to avoid modifying the original
          
          // console.log('Processing chat:', a._id);

          a.participants = await Promise.all(
            (a.participants || [])
              .filter((participant: Participant) => participant !== undefined)
              .map(async (participant: Participant) => {
                try {
                  if (a.chatType === 'DMs') {
                    let user;
                    if (a.participants.length === 2) {
                      delete a.name[a.participants.find((p: Participant) => p.id === payload._id).id]
                      const otherParticipant = a.participants.find((p: Participant) => p.id !== payload._id);
                      user = await func(otherParticipant.id);
                      a.name[otherParticipant.id] = user.name;
                    } else {
                      user = await func(participant.id)
                    }
                    a.verified = user.verified;
                    return {
                      id: participant.id,
                      displayPicture: user.displayPicture,
                      lastMessageId: participant.lastMessageId,
                      unreadCount: participant.unreadCount,
                      favorite: participant.favorite,
                      pinned: participant.pinned,
                      deleted: participant.deleted,
                      archived: participant.archived,
                      chatSettings: participant.chatSettings
                    };
                  } else {
                    // console.log(`User with ID ${participant.id} not found.`);
                    return participant;
                  }
                } catch (error) {
                  console.error(`Error processing participant ${participant.id}:`, error);
                  return participant;
                }
              })
          );

          // console.log('Processed chat:', a._id, 'Participants:', a.participants.length);
          return a as unknown as ChatData;
        } catch (error) {
          console.error('Error processing chat:', chat._id, error);
          return null;
        }
      });

      const newChats = (await Promise.all(newChatsPromises)).filter(chat => chat !== null);
      // console.log('Total processed chats:', newChats.length);

      const chatSettings = newChats.reduce((acc, chat) => {
        if (chat && chat.participants && chat.participants.some((p: Participant) => p.id === payload._id)) {
          const participant = chat.participants.find((p: Participant) => p.id === payload._id);
          acc[chat._id] = participant?.chatSettings as NewChatSettings;
        }
        return acc;
      }, {} as { [key: string]: NewChatSettings });

      const newObj = {
        chats: newChats,
        chatSettings: chatSettings,
        messages: messages,
        requestId: payload._id
      }
      // console.log(newObj)


      res.status(200).json(newObj);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch chats' });
    }
  },

  getChatById: async (req: NextApiRequest, res: NextApiResponse<ChatData | { error: string }>) => {
    try {
      const { id } = req.query;
      const chat = await client.db(MONGODB_DB).collection('chats').findOne({ _id: new ObjectId(id as string) });
      if (chat) {
        // Map the MongoDB document to ChatAttributes
        const formattedChat: ChatData = {
          _id: chat._id.toString(),
          name: chat.name || '',
          chatType: chat.chatType as 'DMs' | 'Groups' | 'Channels',
          participants: chat.participants || [],
          groupDescription: chat.groupDescription || '',
          groupDisplayPicture: chat.groupDisplayPicture || '',
          verified: chat.verified || false,
          adminIds: chat.adminIds || [],
          inviteLink: chat.inviteLink || '',
          isPrivate: chat.isPrivate || false,
          timestamp: chat.timestamp ? new Date(chat.timestamp).toISOString() : new Date().toISOString(),
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

  createChat: async (req: NextApiRequest, res: NextApiResponse<NewChat_ | { error: string }>, payload: Payload) => {
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
        members: chatData.participants, // List of user IDs
      
        // Specific to direct messages
        isBlocked: false,
        lastSeen: new Date().toISOString(), // Timestamp of the last time the user was online
      };
     
      // Chats Collection
      // type is ChatData
      const chat = {
        _id: newID,
        name: chatData.name || {},
        chatType: chatData.chatType as 'DMs' | 'Groups' | 'Channels',
        participants: chatData.participants.map(participantId => ({
          id: participantId,
          lastMessageId: chatData.lastMessageId, // Reference to the last message in Messages collection
          unreadCount: chatData.unreadCounts?.[participantId] || 0,
          favorite: Boolean(chatData.favorite),
          pinned: Boolean(chatData.pinned),
          deleted: Boolean(chatData.deleted),
          archived: Boolean(chatData.archived),
          chatSettings: chatSettings,
          displayPicture: chatData.participantsImg?.[participantId] || ''
        })),
        groupDescription: chatData.groupDescription || '',
        groupDisplayPicture: chatData.groupDisplayPicture || '',
        verified: false,
        adminIds: [chatData.participants[0]], // List of admin user IDs
        isPrivate: false,
        inviteLink: chatData.chatType === 'Groups' ? `/invite/${newID.toString()}` : '',
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      await client.db(MONGODB_DB).collection('chats').insertOne(chat);
      // await client.db(MONGODB_DB).collection('chatSettings').insertOne(chatSettings);

      const newObj = {
        chat: await (async () => {
          const chatCopy: ChatData = { ...chat, _id: chat._id.toString()};
          // delete (chatCopy as any)._id;
          
          if (chatCopy.chatType === 'DMs' && chatCopy.participants.length === 2) {
            delete chatCopy.name[chatCopy.participants.find(p => p.id === payload._id)?.id ?? '']
          }
          
          await Promise.all(chatCopy.participants.map(async (participant, index) => {
            if (chatCopy.chatType === 'DMs' && participant.id !== payload._id) {
              const user = await func(participant.id);
              chatCopy.name[participant.id] = user.name;
              chatCopy.participants[index].displayPicture = user.displayPicture;
            }
          }));
          
          return chatCopy;
        })(),
        requestId: payload._id
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

  updateChatSettings: async (req: NextApiRequest, res: NextApiResponse, payload: Payload) => {
    try {
      const { id } = req.query;
      const updatedSettings: Partial<ChatSettings> = req.body;
      const updateObject: { [key: string]: any } = {};
      
      // Create a proper update object
      Object.keys(updatedSettings).forEach(key => {
        updateObject[`participants.$[elem].chatSettings.${key}`] = updatedSettings[key as keyof ChatSettings];
      });

      await client.db(MONGODB_DB).collection('chats').updateOne(
        { _id: new ObjectId(id as string) },
        { $set: updateObject },
        { 
          arrayFilters: [{ "elem.id": payload._id }],
          upsert: true 
        }
      );

      // Fetch the updated chat to return the new settings
      const updatedChat = await client.db(MONGODB_DB).collection('chats').findOne(
        { _id: new ObjectId(id as string) },
        { projection: { "participants.$[elem].chatSettings": 1 } }
      );

      const updatedChatSettings = updatedChat?.participants.find((p: Participant) => p.id === payload._id)?.chatSettings;

      res.status(200).json(updatedChatSettings);
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
        _id: new ObjectId(chatData._id as string),
        chatId: new ObjectId(chatId as string), // Reference to the chat in DMs collection
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
        quotedMessage: '0',
        status: 'sent' as msgStatus,
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
    // console.log("Mongoconnection: You successfully connected to MongoDB!");
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