import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { ChatData, ChatSettings } from '@/lib/types/type';
import { verifyToken } from '@/lib/auth';
import { getMongoClient } from '@/lib/mongodb';

const MONGODB_DB = 'mydb';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { method } = req;
    if (method !== 'PUT') {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).json(`Method ${method} Not Allowed`);
    }

    const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : '').replace(/"/g, '');
    if (!cookie) return res.status(405).end(`Not Allowed`);
    const payload = await verifyToken(cookie as unknown as string);
    if (!payload) return res.status(401).json(`Not Allowed`);

    try {
      const client = await getMongoClient();
      const { id } = req.query;
      const updatedSettings: Partial<ChatSettings> = req.body;
      // console.log(updatedSettings)
      await client.db(MONGODB_DB).collection('chats').updateOne(
        { _id: new ObjectId(id as string) },
        { $set: { 
          "participants.$[elem].chatSettings": updatedSettings 
        }},
        { 
          arrayFilters: [{ "elem.id": payload._id }],
          upsert: true 
        }
      );
      const updatedChat = await client.db(MONGODB_DB).collection('chats').findOne(
        { _id: new ObjectId(id as string), "participants.id": payload._id },
        { projection: { "participants.chatSettings": 1 } }
      ) as unknown as ChatData;
      const updatedChatSettings = updatedChat?.participants[0]?.chatSettings;
      return res.status(200).json(updatedChatSettings);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update chat settings' });
    }
}
export default handler;