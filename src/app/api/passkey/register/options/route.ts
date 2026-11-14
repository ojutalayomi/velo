import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { SocialMediaUser } from "@/lib/class/User";
import { MongoDBClient } from "@/lib/mongodb";
import { generatePasskeyRegistrationOptions } from "@/lib/webauthn";
import { ObjectId } from "mongodb";

/**
 * Generate registration options for creating a new passkey
 * POST /api/passkey/register/options
 */
export async function POST() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const db = await new MongoDBClient().init();
    const userDoc = await db.users().findOne({ _id: new ObjectId(userId) });

    if (!userDoc) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const user = new SocialMediaUser(userDoc);

    // Generate registration options
    const options = await generatePasskeyRegistrationOptions({
      userId: user.userId,
      username: user.username,
      displayName: user.name,
      existingCredentials: user.passkeys || [],
    });

    // Store the challenge in the database temporarily
    await db.users().updateOne(
      { userId },
      {
        $set: {
          passkeyChallenge: {
            challenge: options.challenge,
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
            type: "registration",
          },
        },
      }
    );

    return NextResponse.json(options);
  } catch (error) {
    console.error("Error generating registration options:", error);
    return NextResponse.json(
      { message: "Failed to generate registration options" },
      { status: 500 }
    );
  }
}
