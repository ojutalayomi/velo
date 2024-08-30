import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb'

const uri = process.env.MONGOLINK ? process.env.MONGOLINK : '';
let client: MongoClient;

interface Payload {
  _id: ObjectId,
  exp: number
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('velo_12')?.value;
  
  if (!token) {
    return NextResponse.json({ message: 'login' }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token) as unknown as Payload;
    
    if (!client) {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true
        },
        connectTimeoutMS: 60000,
        maxPoolSize: 10
      });
      await client.connect();
      console.log("Mongoconnection: You successfully connected to MongoDB!");
    }

    const userCollection = client.db('mydb').collection('Users');
    const user = await userCollection.findOne({ _id: new ObjectId(payload._id) });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const newUserdata = {
        _id: user?._id,
        firstname: user?.firstname,
        lastname: user?.lastname,
        name: user?.name,
        email: user?.email,
        username: user?.username,
        dp: user?.displayPicture,
        verified: user?.verified,
        chatid: user?.userId
    };

    return NextResponse.json(newUserdata);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}