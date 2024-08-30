import type { NextApiRequest, NextApiResponse } from 'next'
import { MongoClient, ServerApiVersion } from 'mongodb'

const uri = process.env.MONGOLINK ? process.env.MONGOLINK : '';
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  },
  connectTimeoutMS: 60000,
  maxPoolSize: 10
});

export default async function handle(req: NextApiRequest, res: NextApiResponse){
    if(req.method === 'GET'){

      try{
        const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : '').replace(/"/g, '');
        const id = req.query.id;
        await client.connect();
        console.log('Connected to post.app');
        let post;
        const collection = client.db('mydb').collection('Posts');
        const collection1 = client.db('mydb').collection('Posts(Comments)');
        const postt = await collection.findOne({ PostID: id });
        const posttt = await collection1.findOne({ PostID: id });
        postt ? post = postt : posttt ? post = posttt : post = null;
        if(post){
          const users = client.db('mydb').collection('Users');
          const user = await users.findOne({ loginToken: cookie });
          if(cookie && user){
            const Likes = client.db('mydb').collection('Posts(Likes)');
            const Shares = client.db('mydb').collection('Posts(Shares)');
            const Bookmarks = client.db('mydb').collection('Posts(Bookmarks)');
            const collections = [Likes, Shares, Bookmarks];
            const properties = ['likes', 'shares', 'bookmarks'];
            const arr2 = ['Liked', 'Shared', 'Bookmarked'];
    
            for (let i = 0; i < collections.length; i++) {
              const collection = collections[i];
              const field = arr2[i];
              const fieldname = properties[i];
              // console.log(fieldname);
        
              // console.log('Before: ', post[field]);
              const result = await collection.findOne({ _id: post.PostID, [`${fieldname}.username`]: user.username });
              if (result) {
                post[field] = true;
                // console.log('Changed Post', post[field]);
                // console.log('After: ', post[field]);
              }
            }
            return res.status(200).json({post: post});
          } else {
            const message =  'Disable Comment.';
            return res.status(200).json({ post, message});
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