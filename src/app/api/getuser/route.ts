import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { MongoClient, ServerApiVersion } from 'mongodb'

const uri = process.env.MONGOLINK ? process.env.MONGOLINK : '';
let client: MongoClient;

export async function GET(request: NextRequest) {
  const token = request.cookies.get('velo_12')?.value;
  
  if (!token) {
    return NextResponse.json({ message: 'login' }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token);
    
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
    }
    console.log("Mongoconnection. You successfully connected to MongoDB!");

    const tokenCollection = client.db('mydb').collection('Tokens');
    const tokenDoc = await tokenCollection.findOne({ userId: payload?.userId });
    if (!tokenDoc) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userCollection = client.db('mydb').collection('Users');
    const user = await userCollection.findOne({ userId: tokenDoc.userId });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const newUserdata = {
        firstname: user?.firstname,
        lastname: user?.lastname,
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