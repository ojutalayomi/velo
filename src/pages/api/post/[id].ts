import { getMongoDb } from '@/lib/mongodb';
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handle(req: NextApiRequest, res: NextApiResponse){
    if(req.method === 'GET'){

      try{
        const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : '').replace(/"/g, '');
        const id = req.query.id;
        const db = await getMongoDb();
        console.log('Connected to post.app');
        const collection = db.collection('Posts');
        const collection1 = db.collection('Posts(Comments)');
        const postt = await collection.findOne({ PostID: id });
        const posttt = await collection1.findOne({ PostID: id });
        const post = postt ? postt : posttt;

        if(post){
          const users = db.collection('Users');
          const user = await users.findOne({ loginToken: cookie });
            if (cookie && user) {
              const collectionsMap = {
                Likes: 'Liked',
                Shares: 'Shared',
                Bookmarks: 'Bookmarked'
              };

              await Promise.all(
                Object.entries(collectionsMap).map(async ([collectionName, field]) => {
                  const collection = db.collection(`Posts(${collectionName})`);
                  const result = await (async () => {
                    if (collectionName === 'Shares') {
                        return collection.findOne({ OriginalPostId: post.OriginalPostId, UserId: user._id.toString() });
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