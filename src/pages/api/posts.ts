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

        const username = req.query.username;

        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Mongoconnection. You successfully connected to MongoDB!");
        const users = client.db('mydb').collection('Users');
        const user = await users.findOne({ username: username });
        const collection = client.db('mydb').collection('Posts');
        const posts = await collection.find({}).toArray();

        if (username && user) {
            const Likes = client.db('mydb').collection('Posts(Likes)');
            const Shares = client.db('mydb').collection('Posts(Shares)');
            const Bookmarks = client.db('mydb').collection('Posts(Bookmarks)');
            const collections = [Likes, Shares, Bookmarks];
            const properties = ['likes', 'shares', 'bookmarks'];
            const arr2 = ['Liked', 'Shared', 'Bookmarked'];
          
            await Promise.all(posts.map(async post => {
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
            }));
          
            return res.json(posts);
        
          } else {
            // console.log(posts)
            return res.json(posts);
          }
        
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}