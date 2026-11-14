import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { getSessionUserId } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import {
  getDeviceName,
  registrationToPasskeyCredential,
  verifyPasskeyRegistration,
} from "@/lib/webauthn";
import { ObjectId } from "mongodb";

/**
 * Verify a passkey registration response
 * POST /api/passkey/register/verify
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { response, deviceName } = body as {
      response: RegistrationResponseJSON;
      deviceName?: string;
    };

    if (!response) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const db = await new MongoDBClient().init();
    const userDoc = await db.users().findOne({ _id: new ObjectId(userId) });

    if (!userDoc) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Retrieve and validate the challenge
    const storedChallenge = userDoc.passkeyChallenge;
    if (
      !storedChallenge ||
      storedChallenge.type !== "registration" ||
      storedChallenge.expiresAt < Date.now()
    ) {
      return NextResponse.json({ message: "Invalid or expired challenge" }, { status: 400 });
    }

    // Verify the registration response
    const verification = await verifyPasskeyRegistration({
      response,
      expectedChallenge: storedChallenge.challenge,
    });

    if (!verification.verified) {
      return NextResponse.json({ message: "Verification failed" }, { status: 400 });
    }

    // Get device name from user agent if not provided
    const userAgent = (await headers()).get("user-agent") || "";
    const finalDeviceName = deviceName || getDeviceName(userAgent);

    // Convert to PasskeyCredential and add transports from response
    const credential = registrationToPasskeyCredential(verification, finalDeviceName);
    if (response.response.transports) {
      credential.transports =
        response.response.transports as AuthenticatorTransport[];
    }

    // Add the new credential to the user's passkeys
    await db.users().updateOne(
      { userId },
      {
        $push: { passkeys: credential },
        $unset: { passkeyChallenge: "" },
      }
    );

    return NextResponse.json({
      verified: true,
      credential: {
        id: credential.id,
        name: credential.name,
        createdAt: credential.createdAt,
      },
    });
  } catch (error) {
    console.error("Error verifying registration:", error);
    return NextResponse.json({ message: "Failed to verify registration" }, { status: 500 });
  }
}
