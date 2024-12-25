import type { NextApiRequest, NextApiResponse } from 'next'
import { MongoClient, ServerApiVersion } from 'mongodb'

const uri = process.env.MONGOLINK || '';
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
    },
    connectTimeoutMS: 60000,
    maxPoolSize: 10
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { username } = req.query;

    try {
        await client.connect();
        const db = client.db('mydb');
        const users = db.collection('Users');
        const posts = db.collection('Posts');

        // Find user
        const user = await users.findOne({ username: username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get all posts by username
        const userPosts = await posts.find({ Username: username }).toArray();

        // Get interaction collections
        const Likes = db.collection('Posts(Likes)');
        const Shares = db.collection('Posts(Shares)');
        const Bookmarks = db.collection('Posts(Bookmarks)');
        const collections = [Likes, Shares, Bookmarks];
        const properties = ['likes', 'shares', 'bookmarks'];
        const arr2 = ['Liked', 'Shared', 'Bookmarked'];

        // Add interaction flags for the requesting user if they exist
        await Promise.all(userPosts.map(async post => {
            for (let i = 0; i < collections.length; i++) {
                const collection = collections[i];
                const field = arr2[i];
                const fieldname = properties[i];
                const result = await collection.findOne({ 
                    _id: post.PostID, 
                    [`${fieldname}.username`]: username 
                });
                post[field] = !!result;
            }
        }));

        return res.status(200).json(userPosts);

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        await client.close();
    }
}
