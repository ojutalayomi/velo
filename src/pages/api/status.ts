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

        try {
    
            console.log('Connected to database');
            const collection = client.db('mydb').collection('Users');
            const status = await collection.find({}).toArray();
            const statuses: string[] = [];
            status.forEach(user => {
              statuses.push(user.displayPicture);
              //console.log('Display Picture:', user.displayPicture);
            });
            res.json(statuses);
          } catch (err) {
            console.error('Error: ', err);
            res.status(500).json({ error: err });
          }
        
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}