import { headers } from "next/headers";
import { AccountSuspendedError, SUSPENDED_MESSAGE } from "@/lib/suspension";
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
    let responseChallenge: string;
    try {
      const clientData = JSON.parse(
        Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8")
      ) as { challenge?: string };
      if (!clientData.challenge) {
        throw new Error("Challenge missing from client data");
      }
      responseChallenge = clientData.challenge;
    } catch {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    // Challenges live in their own collection so concurrent options requests
    // can each keep an outstanding challenge.
    const challenges = database.collection<{
      challenge: string;
      expiresAt: Date;
      type: string;
    }>("passkey_challenges");

    const stored = await challenges.findOne({
      type: "authentication",
      challenge: responseChallenge,
      expiresAt: { $gt: new Date() },
    });

    if (!stored) {
      return NextResponse.json(
        { message: "Challenge expired, please try again" },
        { status: 400 }
      );
    }

    // Single use: only one request can consume it
    const consumed = await challenges.deleteOne({ _id: stored._id });
    if (consumed.deletedCount !== 1) {
      return NextResponse.json(
        { message: "Challenge already used, please try again" },
        { status: 400 }
      );
    }

    // Verify the authentication response
    let verification;
    try {
      verification = await verifyPasskeyAuthentication({
        response,
        expectedChallenge: stored.challenge,
        credential,
      });
    } catch (err) {
      console.error("Passkey verification rejected:", err);
      return NextResponse.json({ message: "Verification failed" }, { status: 400 });
    }

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
    if (error instanceof AccountSuspendedError) {
      return NextResponse.json({ message: SUSPENDED_MESSAGE, code: "suspended" }, { status: 403 });
    }
    console.error("Error verifying authentication:", error);
    return NextResponse.json({ message: "Failed to verify authentication" }, { status: 500 });
  }
}
