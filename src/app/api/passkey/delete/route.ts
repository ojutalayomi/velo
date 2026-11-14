import { NextRequest, NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";

/**
 * Delete a passkey
 * DELETE /api/passkey/delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get("id");

    if (!credentialId) {
      return NextResponse.json({ message: "Credential ID required" }, { status: 400 });
    }

    const db = await new MongoDBClient().init();

    // Remove the credential from the user's passkeys array
    const result = await db.users().updateOne(
      { userId },
      {
        $pull: { passkeys: { id: credentialId } },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ message: "Passkey not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Passkey deleted successfully" });
  } catch (error) {
    console.error("Error deleting passkey:", error);
    return NextResponse.json({ message: "Failed to delete passkey" }, { status: 500 });
  }
}
