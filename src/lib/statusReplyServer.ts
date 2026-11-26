import { NextResponse } from "next/server";

import { findOrCreateDm } from "@/lib/dmServer";
import { MongoDBClient } from "@/lib/mongodb";
import { canSeeStatusOf, findLiveStatus } from "@/lib/statusServer";

/**
 * Everything that must be true before someone may reply to a status, and the DM the reply goes to
 * (made if it doesn't exist yet). Shared by text replies and voice replies.
 */
export async function prepareStatusReply(userId: string, statusId: string) {
  const db = await new MongoDBClient().init();
  const status = await findLiveStatus(db, statusId);
  if (!status) return { error: NextResponse.json({ message: "This status is no longer available" }, { status: 404 }) };
  if (status.userId === userId) {
    return { error: NextResponse.json({ message: "You can't reply to your own status" }, { status: 400 }) };
  }
  if (!(await canSeeStatusOf(db, userId, status.userId))) {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }
  const blocked = await db.blockedUsers().findOne({ blockerId: status.userId, blockedId: userId });
  if (blocked) return { error: NextResponse.json({ message: "You can't reply to this status" }, { status: 403 }) };

  const dm = await findOrCreateDm(db, userId, status.userId);
  if (!dm) return { error: NextResponse.json({ message: "Could not open the chat" }, { status: 500 }) };
  return { error: undefined, db, status, dm };
}
