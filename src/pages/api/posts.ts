import type { NextApiRequest, NextApiResponse } from 'next';
import { getMongoDb } from '@/lib/mongodb';
import { Db } from 'mongodb';
import { addInteractionFlags } from '../../lib/apiUtils';

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const username = req.query.username as string;
    const db = await getMongoDb();

    console.log('MongoDB connection established successfully!');

    // Fetch user details if username is provided
    const user = username ? await db.collection('Users').findOne({ username }) : null;

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
async function fetchPostsFromMultipleCollections(db: Db) {
  // Fetch posts from the 'Posts' collection
  const posts = await db.collection('Posts').find({}).toArray();

  // Fetch posts from the 'Posts_Comments' collection
  // const comments = await db.collection('Posts_Comments').find({}).toArray();

  // Fetch posts from the 'Posts_Shares' collection
  const shares = await db.collection('Posts_Shares').find({}).toArray();

  // Combine all results into a single array
  const combinedPosts = [...posts, ...shares];

  // Sort the combined posts by a common field (e.g., `TimeOfPost`) if needed
  combinedPosts.sort((a, b) => new Date(b.TimeOfPost).getTime() - new Date(a.TimeOfPost).getTime());

  return combinedPosts;
}

