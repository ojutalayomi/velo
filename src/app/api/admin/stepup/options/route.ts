import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin";
import { SocialMediaUser } from "@/lib/class/User";
import { MongoDBClient } from "@/lib/mongodb";
import { generatePasskeyAuthenticationOptions } from "@/lib/webauthn";
import { ObjectId } from "mongodb";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** POST /api/admin/stepup/options: passkey challenge for the signed-in admin only. */
export async function POST() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  try {
    const db = await new MongoDBClient().init();
    const userDoc = await db.users().findOne({ _id: new ObjectId(admin._id) });
    const credentials = userDoc ? new SocialMediaUser(userDoc).passkeys || [] : [];
    if (!credentials.length) {
      return NextResponse.json(
        { message: "Register a passkey on your account first", code: "no_passkey" },
        { status: 409 }
      );
    }

    const options = await generatePasskeyAuthenticationOptions({ credentials });
    const database = await db.getDb();
    await database.collection("passkey_challenges").insertOne({
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      type: "admin-stepup",
      userId: admin._id,
      createdAt: new Date(),
    });
    return NextResponse.json(options);
  } catch (error) {
    console.error("Admin step-up options error:", error);
    return NextResponse.json({ message: "Failed to start verification" }, { status: 500 });
  }
}
