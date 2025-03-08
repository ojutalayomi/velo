import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import { getMongoClient } from '@/lib/mongodb'

interface Schema {
  _id?: ObjectId,
  time?: string,
  userId?: string,
  firstname?: string,
  lastname?: string,
  email?: string,
  username?: string,
  password?: string,
  displayPicture?: string,
  isEmailConfirmed?: true,
  confirmationToken?: null,
  signUpCount?: 1,
  lastLogin?: string,
  loginToken?: string,
  lastResetAttempt?: {
    [x: string]: string
  },
  resetAttempts?: 6,
  password_reset_time?: string,
  theme?: string,
  verified?: true,
  followers?: [],
  following?: [],
  bio?: string,
  coverPhoto?: string,
  dob?: string,
  lastUpdate?: string[],
  location?: string,
  noOfUpdates?: 9,
  website?: string,
  resetToken?: string,
  resetTokenExpiry?: number,
  name?: string
}

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  const { query, search } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const client = await getMongoClient();

    const collection = client.db('mydb').collection('Users');
    let users;
    if (search) {
      if (!ObjectId.isValid(query as string)) {
        return res.status(400).json({ error: 'Invalid ObjectId format' });
      }
      const data = await collection.findOne({_id: new ObjectId(query as string)});
      users = [data];
    } else {
      users = await collection.find({
        $or: [
          { name: { $regex: decodeURIComponent(query as string), $options: 'i' } },
          { username: { $regex: decodeURIComponent(query as string), $options: 'i' } }
        ]
      }).toArray();
    }
  
    if (!users) {
      return res.status(401).json({ error: 'Invalid username or email' });
    }

    const attributesToRemove = ["password", "password_reset_time", "loginToken"];

    const newUsers = users.map((obj: any) => {
        let newObj = { ...obj };
        attributesToRemove.forEach(attr => delete newObj[attr]);
        return newObj;
    });

    res.status(200).json(newUsers);
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}