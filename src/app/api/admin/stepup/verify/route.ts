import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_STEPUP_COOKIE,
  ADMIN_STEPUP_TTL_SECONDS,
  getAdminUser,
  logAdminAction,
  signAdminStepUp,
} from "@/lib/admin";
import { SocialMediaUser } from "@/lib/class/User";
import { MongoDBClient } from "@/lib/mongodb";
import { verifyPasskeyAuthentication } from "@/lib/webauthn";

/** POST /api/admin/stepup/verify: checks the passkey and sets the short-lived admin cookie. */
export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  try {
    const { response } = (await request.json()) as { response: AuthenticationResponseJSON };
    if (!response?.id) return NextResponse.json({ message: "Invalid request" }, { status: 400 });

    const db = await new MongoDBClient().init();
    const userDoc = await db.users().findOne({ _id: new ObjectId(admin._id) });
    const credential = userDoc
      ? new SocialMediaUser(userDoc).passkeys?.find((c) => c.id === response.id)
      : undefined;
    // The passkey must belong to this admin, not just any user.
    if (!userDoc || !credential) {
      return NextResponse.json({ message: "Verification failed" }, { status: 400 });
    }

    let challenge: string;
    try {
      const clientData = JSON.parse(
        Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8")
      ) as { challenge?: string };
      if (!clientData.challenge) throw new Error("missing");
      challenge = clientData.challenge;
    } catch {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const challenges = (await db.getDb()).collection<{
      challenge: string;
      expiresAt: Date;
      type: string;
      userId: string;
    }>("passkey_challenges");
    const stored = await challenges.findOne({
      type: "admin-stepup",
      userId: admin._id,
      challenge,
      expiresAt: { $gt: new Date() },
    });
    if (!stored) {
      return NextResponse.json({ message: "Challenge expired, try again" }, { status: 400 });
    }
    const consumed = await challenges.deleteOne({ _id: stored._id });
    if (consumed.deletedCount !== 1) {
      return NextResponse.json({ message: "Challenge already used" }, { status: 400 });
    }

    let verified = false;
    try {
      const v = await verifyPasskeyAuthentication({
        response,
        expectedChallenge: stored.challenge,
        credential,
      });
      verified = v.verified;
      if (verified) {
        await db.users().updateOne(
          { _id: userDoc._id, "passkeys.id": credential.id },
          {
            $set: {
              "passkeys.$.counter": v.authenticationInfo.newCounter,
              "passkeys.$.lastUsedAt": new Date().toISOString(),
            },
          }
        );
      }
    } catch (err) {
      console.error("Admin step-up rejected:", err);
    }
    if (!verified) return NextResponse.json({ message: "Verification failed" }, { status: 400 });

    await logAdminAction({ adminId: admin._id, action: "admin_stepup", targetId: admin._id });

    const res = NextResponse.json({ verified: true });
    res.cookies.set(ADMIN_STEPUP_COOKIE, await signAdminStepUp(admin._id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_STEPUP_TTL_SECONDS,
    });
    return res;
  } catch (error) {
    console.error("Admin step-up verify error:", error);
    return NextResponse.json({ message: "Failed to verify" }, { status: 500 });
  }
}
