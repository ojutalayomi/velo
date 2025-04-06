import { getMongoDb } from '@/lib/mongodb';
import { addInteractionFlags } from '@/lib/apiUtils';
import { ObjectId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { userId } = req.query;

    try {
        const db = await getMongoDb();
        const users = db.collection('Users');
        const posts = db.collection('Posts');

        // Find user
        const user = await users.findOne({ _id: new ObjectId(userId as string) });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get all posts by username
        const userPosts = await db.collection('Posts').find({
          $or: [
            { UserId: userId },
            { UserId: userId, collection: 'Posts(Shares)' }
          ]
        }).toArray();

        await addInteractionFlags(db, userPosts, user._id.toString());

        return res.status(200).json(userPosts);

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
