import { addInteractionFlags } from '@/lib/apiUtils';
import { getMongoDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { username } = req.query;

    try {
        const db = await getMongoDb();
        const users = db.collection('Users');
        const posts = db.collection('Posts');

        // Find user
        const user = await users.findOne({ username: username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get all posts by username
        const userPosts = await posts.find({ $or: [
            { UserId: user._id.toString() },
            { Username: user.username}
        ] }).toArray();
        const shares = await db.collection('Posts_Shares').find({ UserId: user._id.toString() }).toArray();

        // Combine all results into a single array
        const combinedPosts = [...userPosts, ...shares];

        // Sort the combined posts by a common field (e.g., `TimeOfPost`) if needed
        combinedPosts.sort((a, b) => new Date(b.TimeOfPost).getTime() - new Date(a.TimeOfPost).getTime());

        // Add interaction flags for the requesting user if they exist
        await addInteractionFlags(db, combinedPosts, user._id.toString());

        return res.status(200).json(combinedPosts);

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
