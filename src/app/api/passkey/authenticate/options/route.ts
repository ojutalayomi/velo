import { NextRequest, NextResponse } from "next/server";

import { SocialMediaUser } from "@/lib/class/User";
import { MongoDBClient } from "@/lib/mongodb";
import { generatePasskeyAuthenticationOptions } from "@/lib/webauthn";

/**
 * Generate authentication options for signing in with a passkey
 * POST /api/passkey/authenticate/options
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    const db = await new MongoDBClient().init();

    let credentials: any[] = [];
    let userId: string | null = null;

    // If username is provided, find user and their credentials
    if (username) {
      const userDoc = await db.users().findOne({
        $or: [{ username }, { email: username }],
      });

      if (userDoc) {
        const user = new SocialMediaUser(userDoc);
        credentials = user.passkeys || [];
        userId = user.userId;
      }
    }

    // Generate authentication options
    const options = await generatePasskeyAuthenticationOptions({
      credentials,
    });

    // Store the challenge temporarily
    if (userId) {
      await db.users().updateOne(
        { userId },
        {
          $set: {
            passkeyChallenge: {
              challenge: options.challenge,
              expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
              type: "authentication",
            },
          },
        }
      );
    } else {
      // For discoverable credentials (no username), store in a temporary collection
      const database = await db.getDb();
      await database.collection("passkey_challenges").insertOne({
        challenge: options.challenge,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        type: "authentication",
        createdAt: new Date(),
      });
    }

    return NextResponse.json(options);
  } catch (error) {
    console.error("Error generating authentication options:", error);
    return NextResponse.json(
      { message: "Failed to generate authentication options" },
      { status: 500 }
    );
  }
}
