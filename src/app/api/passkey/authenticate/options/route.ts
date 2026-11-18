import { Db } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { SocialMediaUser } from "@/lib/class/User";
import { MongoDBClient } from "@/lib/mongodb";
import { generatePasskeyAuthenticationOptions } from "@/lib/webauthn";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

let challengeIndexReady: Promise<unknown> | null = null;

function ensureChallengeIndex(database: Db) {
  challengeIndexReady ??= database
    .collection("passkey_challenges")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    .catch((error) => {
      console.error("Failed to create passkey challenge TTL index:", error);
    });
  return challengeIndexReady;
}

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

    // If username is provided, find user and their credentials
    if (username) {
      const userDoc = await db.users().findOne({
        $or: [{ username }, { email: username }],
      });

      if (userDoc) {
        const user = new SocialMediaUser(userDoc);
        credentials = user.passkeys || [];
      }
    }

    // Generate authentication options
    const options = await generatePasskeyAuthenticationOptions({
      credentials,
    });

    // Always store in the temporary collection so concurrent options requests
    // (e.g. autofill plus a button click) can each keep their own challenge.
    const database = await db.getDb();
    await ensureChallengeIndex(database);
    await database.collection("passkey_challenges").insertOne({
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      type: "authentication",
      createdAt: new Date(),
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error("Error generating authentication options:", error);
    return NextResponse.json(
      { message: "Failed to generate authentication options" },
      { status: 500 }
    );
  }
}
