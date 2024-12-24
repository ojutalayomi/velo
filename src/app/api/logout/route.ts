// src/app/api/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { cookies } from 'next/headers';

let client: MongoClient;
const uri = process.env.MONGOLINK ? process.env.MONGOLINK : '';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
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

    const tokenCollection = client.db('mydb').collection('Tokens');
    const token = cookieStore.get('velo_12')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 });
    }

    // Delete the token from the Tokens collection
    await tokenCollection.deleteOne({ token });

    // Create a new response
    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

    // Clear the cookie
    response.cookies.set('velo_12', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('An error occurred:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}