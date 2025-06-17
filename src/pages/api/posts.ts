import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoDBClient } from '@/lib/mongodb';
import { Db, ObjectId } from 'mongodb';
import { addInteractionFlags } from '../../lib/apiUtils';
import { verifyToken } from '@/lib/auth';
import { Payload } from '@/lib/types/type';

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : '').replace(/"/g, '');
    const payload = await verifyToken(cookie) as unknown as Payload;
    // if (!payload) return res.status(401).json({ error: `Not Allowed` });
    // if (payload.exp < Date.now() / 1000) return res.status(401).json({ error: `Token expired` });

    const db = await new MongoDBClient().init();

    console.log('MongoDB connection established successfully!');

    // Fetch user details if username is provided
    const user = payload ? await db.users().findOne({ _id: new ObjectId(payload._id) }) : null;

    // Fetch posts from multiple collections
    const posts = await fetchPostsFromMultipleCollections(db);

    // Add interaction flags if a user is found
    if (user) {
      await addInteractionFlags(db, posts, user._id.toString());
    }

    return res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

// -----------------------------
// Helper Functions
// -----------------------------

/**
 * Fetch posts from multiple collections in the database.
 */
async function fetchPostsFromMultipleCollections(db: MongoDBClient) {
  // Fetch posts from the 'Posts' collection
  const posts = await db.posts().find({}).toArray();

  // Fetch posts from the 'Posts_Comments' collection
  // const comments = await db.collection('Posts_Comments').find({}).toArray();

  // Fetch posts from the 'Posts_Shares' collection
  const shares = await db.postsShares().find({}).toArray();

  // Combine all results into a single array
  const combinedPosts = [...posts, ...shares];

  // Sort the combined posts by a common field (e.g., `TimeOfPost`) if needed
  combinedPosts.sort((a, b) => new Date(b.TimeOfPost).getTime() - new Date(a.TimeOfPost).getTime());

  return combinedPosts;
}

