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
        const collection = client.db('mydb').collection('Users');
        const user = await collection.findOne({ username: username });

        // const status = await collection.find({}).toArray();
        res.status(200).json(user);
        // console.log(user);
        
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}