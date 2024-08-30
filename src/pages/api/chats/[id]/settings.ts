import { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import { ChatAttributes, ChatSettings, Err, MessageAttributes, NewChat, NewChatResponse, NewChatSettings } from '@/lib/types/type';
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

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { method } = req;
    if (method !== 'PUT') {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).json(`Method ${method} Not Allowed`);
    }

    const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : '').replace(/"/g, '');
    // if (!cookies) return res.status(405).end(`Not Allowed`);
    const payload = await verifyToken(cookie as unknown as string);
    if (!payload) return res.status(401).json(`Not Allowed`);

    try {
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
      const { id } = req.query;
      const updatedSettings: Partial<ChatSettings> = req.body;
      console.log(updatedSettings)
      await client.db(MONGODB_DB).collection('chats').updateOne(
        { _id: new ObjectId(id as string) },
        { $set: updatedSettings },
        { upsert: true }
      );
      return res.status(200).json('Success');
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update chat settings' });
    }
}
export default handler;