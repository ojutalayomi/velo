import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { MongoDBClient } from "@/lib/mongodb";

interface Payload {
  _id: ObjectId;
  exp: number;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("velo_12")?.value;

  if (!token) {
    return NextResponse.json({ message: "login" }, { status: 401 });
  }

  try {
    const payload = (await verifyToken(token)) as unknown as Payload;

    const db = await new MongoDBClient().init();

    const userCollection = db.users();
    const user = await userCollection.findOne(
      { _id: new ObjectId(payload._id) },
      {
        projection: {
          _id: 1,
          firstname: 1,
          lastname: 1,
          name: 1,
          email: 1,
          username: 1,
          displayPicture: 1,
          verified: 1,
          userId: 1,
        },
      }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
