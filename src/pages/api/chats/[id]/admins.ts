import { ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { checkAdminChange } from "@/lib/chatPermissions";
import { isChatMember } from "@/lib/chatMembership";
import { MongoDBClient } from "@/lib/mongodb";
import { emitViaSocketServer } from "@/lib/socket";

/** PUT { userId, admin } promotes (admin: true) or demotes (admin: false) a group member. */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const cookie = decodeURIComponent(req.cookies.velo_12 ?? "").replace(/"/g, "");
  if (!cookie) return res.status(401).json({ error: "Unauthorized" });

  const payload = await verifyToken(cookie);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });
  const callerId = String(payload._id);

  const { id } = req.query;
  if (typeof id !== "string" || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid chat id" });
  }

  const { userId, admin } = req.body ?? {};
  if (typeof userId !== "string" || !ObjectId.isValid(userId) || typeof admin !== "boolean") {
    return res.status(400).json({ error: "userId and admin are required" });
  }

  try {
    const db = await new MongoDBClient().init();
    const chat = await db.chats().findOne({ _id: new ObjectId(id) });
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (chat.chatType !== "Group") {
      return res.status(400).json({ error: "Only groups have admins" });
    }
    if (!(await isChatMember(db, id, callerId))) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const adminIds = chat.adminIds ?? [];
    const check = checkAdminChange({
      adminIds,
      isTargetMember: await isChatMember(db, id, userId),
      callerId,
      targetId: userId,
      makeAdmin: admin,
    });
    if (!check.ok) return res.status(check.status).json({ error: check.error });
    if (check.noop) return res.status(200).json({ adminIds });

    // The filter re-checks the roster at write time, so two concurrent demotions cannot leave
    // the group without an admin, and an admin removed meanwhile cannot still change roles.
    const result = admin
      ? await db
          .chats()
          .findOneAndUpdate(
            { _id: chat._id, adminIds: callerId },
            { $addToSet: { adminIds: userId } },
            { returnDocument: "after", projection: { adminIds: 1 } }
          )
      : await db
          .chats()
          .findOneAndUpdate(
            { _id: chat._id, adminIds: callerId, "adminIds.1": { $exists: true } },
            { $pull: { adminIds: userId } },
            { returnDocument: "after", projection: { adminIds: 1 } }
          );
    if (!result) {
      return res.status(409).json({ error: "Admins changed while updating; please try again" });
    }

    try {
      await emitViaSocketServer(callerId, "chat:updated", { chatId: id });
    } catch (error) {
      // Persisted already; members pick the change up on their next fetch.
      console.error("Failed to announce the admin change:", error);
    }

    return res.status(200).json({ adminIds: result.adminIds ?? [] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update admin role" });
  }
};

export default handler;
