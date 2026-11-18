import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * List all passkeys for the current user
 * GET /api/passkey/list
 */
export async function GET() {
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

    const passkeys = (userDoc.passkeys || []).map((passkey: any) => ({
      id: passkey.id,
      name: passkey.name,
      createdAt: passkey.createdAt,
      lastUsedAt: passkey.lastUsedAt,
      transports: passkey.transports,
      credentialBackedUp: passkey.credentialBackedUp,
      credentialDeviceType: passkey.credentialDeviceType,
    }));

    return NextResponse.json({ passkeys });
  } catch (error) {
    console.error("Error listing passkeys:", error);
    return NextResponse.json({ message: "Failed to list passkeys" }, { status: 500 });
  }
}
