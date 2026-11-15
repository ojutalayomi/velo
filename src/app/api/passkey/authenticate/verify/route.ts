import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { setCookie } from "@/lib/auth";
import { SocialMediaUser } from "@/lib/class/User";
import { MongoDBClient } from "@/lib/mongodb";
import { verifyPasskeyAuthentication } from "@/lib/webauthn";

/**
 * Verify a passkey authentication response
 * POST /api/passkey/authenticate/verify
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { response } = body as { response: AuthenticationResponseJSON };

    if (!response || !response.id) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const db = await new MongoDBClient().init();
    const database = await db.getDb();

    // Find the user with this credential
    const userDoc = await db.users().findOne({
      "passkeys.id": response.id,
    });

    if (!userDoc) {
      return NextResponse.json({ message: "Credential not found" }, { status: 404 });
    }

    const user = new SocialMediaUser(userDoc);

    // Find the specific credential
    const credential = user.passkeys?.find((c) => c.id === response.id);
    if (!credential) {
      return NextResponse.json({ message: "Credential not found" }, { status: 404 });
    }

    // The challenge the client actually signed is inside response.clientDataJSON.
    const clientData = JSON.parse(
      Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8")
    ) as { challenge: string };
    const responseChallenge = clientData.challenge;

    // Find the matching challenge, preferring the one stored on the user doc.
    let storedChallenge: {
      challenge: string;
      expiresAt: number;
      type: string;
    } | null = null;
    let challengeSource: "user" | "temp" | null = null;

    const userChallenge = userDoc.passkeyChallenge;
    if (
      userChallenge &&
      userChallenge.type === "authentication" &&
      userChallenge.challenge === responseChallenge &&
      userChallenge.expiresAt >= Date.now()
    ) {
      storedChallenge = {
        challenge: userChallenge.challenge,
        expiresAt: userChallenge.expiresAt,
        type: userChallenge.type,
      };
      challengeSource = "user";
    } else {
      // Check temporary challenges collection for discoverable credentials
      const tempChallenge = await database
        .collection<{
          challenge: string;
          expiresAt: Date;
          type: string;
        }>("passkey_challenges")
        .findOne({
          type: "authentication",
          challenge: responseChallenge,
          expiresAt: { $gt: new Date() },
        });

      if (tempChallenge) {
        storedChallenge = {
          challenge: tempChallenge.challenge,
          expiresAt: tempChallenge.expiresAt.getTime(),
          type: tempChallenge.type,
        };
        challengeSource = "temp";
      }
    }

    if (!storedChallenge) {
      return NextResponse.json(
        { message: "No matching authentication challenge" },
        { status: 400 }
      );
    }

    // Verify the authentication response
    const verification = await verifyPasskeyAuthentication({
      response,
      expectedChallenge: storedChallenge.challenge,
      credential,
    });

    if (!verification.verified) {
      return NextResponse.json({ message: "Verification failed" }, { status: 400 });
    }

    // Update the credential's counter and last used timestamp
    await db.users().updateOne(
      { _id: userDoc._id, "passkeys.id": credential.id },
      {
        $set: {
          "passkeys.$.counter": verification.authenticationInfo.newCounter,
          "passkeys.$.lastUsedAt": new Date().toISOString(),
        },
      }
    );

    // Clean up the challenge that was actually used
    if (challengeSource === "user") {
      await db.users().updateOne(
        { _id: userDoc._id },
        { $unset: { passkeyChallenge: "" } }
      );
    } else if (challengeSource === "temp") {
      await database
        .collection("passkey_challenges")
        .deleteOne({ challenge: storedChallenge.challenge });
    }

    // Update last login
    await db.users().updateOne(
      { _id: userDoc._id },
      { $set: { lastLogin: new Date().toISOString() } }
    );

    // Create session
    const userAgent = (await headers()).get("user-agent") || "";
    await user.setSession(db, userAgent, "app", undefined, setCookie);

    return NextResponse.json({
      verified: true,
      user: user.getClientSafeData(),
    });
  } catch (error) {
    console.error("Error verifying authentication:", error);
    return NextResponse.json({ message: "Failed to verify authentication" }, { status: 500 });
  }
}
