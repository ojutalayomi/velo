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

    // Retrieve and validate the challenge
    let storedChallenge: any;

    if (userDoc.passkeyChallenge) {
      storedChallenge = userDoc.passkeyChallenge;
    } else {
      // Check temporary challenges collection for discoverable credentials
      const tempChallenge = await database
        .collection("passkey_challenges")
        .findOne({
          type: "authentication",
          expiresAt: { $gt: new Date() },
        });

      if (tempChallenge) {
        storedChallenge = {
          challenge: tempChallenge.challenge,
          expiresAt: tempChallenge.expiresAt.getTime(),
          type: tempChallenge.type,
        };
      }
    }

    if (
      !storedChallenge ||
      storedChallenge.type !== "authentication" ||
      storedChallenge.expiresAt < Date.now()
    ) {
      return NextResponse.json({ message: "Invalid or expired challenge" }, { status: 400 });
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
      { userId: user.userId, "passkeys.id": credential.id },
      {
        $set: {
          "passkeys.$.counter": verification.authenticationInfo.newCounter,
          "passkeys.$.lastUsedAt": new Date().toISOString(),
        },
        $unset: { passkeyChallenge: "" },
      }
    );

    // Clean up temporary challenge if used
    if (!userDoc.passkeyChallenge) {
      await database
        .collection("passkey_challenges")
        .deleteOne({ challenge: storedChallenge.challenge });
    }

    // Update last login
    await db.users().updateOne({ userId: user.userId }, { $set: { lastLogin: new Date().toISOString() } });

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
