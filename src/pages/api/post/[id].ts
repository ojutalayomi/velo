import { verifyToken } from '@/lib/auth';
import { getMongoDb } from '@/lib/mongodb';
import { Payload } from '@/lib/types/type';
import { Db, ObjectId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handle(req: NextApiRequest, res: NextApiResponse){
    if(req.method === 'GET'){

      try{
        const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : '').replace(/"/g, '');
        const payload = await verifyToken(cookie) as unknown as Payload;

        if (!req.query.id) return res.status(400).json({ error: `Post ID is required` });
        const id = req.query.id;

        const db = await getMongoDb();
        console.log('Connected to post.app');
        const post = await fetchPostsFromMultipleCollections(db, `${id}`);

        if(post){
          const users = db.collection('Users');
          const user = payload ? await users.findOne({ _id: new ObjectId(payload._id) }) : null;

          if (user) {
            const collectionsMap = {
              Likes: 'Liked',
              Shares: 'Shared',
              Bookmarks: 'Bookmarked'
            };

            await Promise.all(
              Object.entries(collectionsMap).map(async ([collectionName, field]) => {
                const collection = db.collection(`Posts_${collectionName}`);
                const result = await (async () => {
                  if (collectionName === 'Shares') {
                    return collection.findOne({ OriginalPostId: post.PostID, UserId: user._id.toString() });
                  }
                  return collection.findOne({ postId: post.PostID, userId: user._id.toString() });
                })();
                if (result) {
                  post[field] = true;
                }
              })
            );

            return res.status(200).json({ post });
          } else {
            return res.status(200).json({ post, message: 'Disable Comment.' });
          }
        }
        return res.status(400).json({ error: 'Oops! Post not found. You can search for other things.' });
      }
      catch(err){
        console.error('Error: ', err);
        res.status(500).json({ error: err });
      }
        
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}

async function fetchPostsFromMultipleCollections(db: Db, id: string) {
  // Fetch posts from the 'Posts' collection
  const post = await db.collection('Posts').findOne({ PostID: id });

  // Fetch posts from the 'Posts_Comments' collection
  const comment = await db.collection('Posts_Comments').findOne({ PostID: id });

  // Fetch posts from the 'Posts_Shares' collection
  const share = await db.collection('Posts_Shares').findOne({ PostID: id });

  // Combine all results into a single array
  const combinedPost = post ? post : comment ? comment : share ? share : null;

  return combinedPost;
}