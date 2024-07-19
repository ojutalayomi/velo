import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { MongoClient, ServerApiVersion } from 'mongodb'

const uri = process.env.MONGOLINK ? process.env.MONGOLINK : '';
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  },
  connectTimeoutMS: 3000,
  maxPoolSize: 10
});

export async function GET(request: NextRequest) {
  const token = request.cookies.get('velo_12')?.value;
  
  if (!token) {
    return NextResponse.json('login');
  }

  try {
    const payload = await verifyToken(token);
    
    await client.connect();
    
    console.log("Mongoconnection. You successfully connected to MongoDB!");
    const collection = client.db('mydb').collection('Users');
    const user = await collection.findOne({username: payload?.username });
    const newUserdata = {
        firstname: user?.firstname,
        lastname: user?.lastname,
        email: user?.email,
        username: user?.username,
        dp: user?.displayPicture,
        verified: user?.verified
    };

    return NextResponse.json(newUserdata);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}