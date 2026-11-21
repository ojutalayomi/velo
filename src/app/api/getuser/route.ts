import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth";
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
          coverPhoto: 1,
          displayPicture: 1,
          verified: 1,
          userId: 1,
          role: 1,
          suspended: 1,
          bio: 1,
          location: 1,
          website: 1,
          dob: 1,
          isPrivate: 1,
          theme: 1,
          usernameChangedAt: 1,
          isEmailConfirmed: 1,
        },
      }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.suspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    // Only an explicit `false` is unconfirmed; accounts created before this
    // flag existed have no value and stay allowed.
    if (user.isEmailConfirmed === false) {
      return NextResponse.json(
        { error: "Email not confirmed", code: "email_unconfirmed", email: user.email },
        { status: 403 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
