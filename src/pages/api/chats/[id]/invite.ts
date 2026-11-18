import { ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import {
  DEFAULT_INVITE_HOURS,
  MAX_INVITE_HOURS,
  MAX_INVITE_USES,
  ensureChatInviteIndexes,
  hashInviteToken,
  inviteMetadata,
  newInviteToken,
} from "@/lib/chatInvites";
import { isChatMember } from "@/lib/chatMembership";
import { MongoDBClient } from "@/lib/mongodb";
import { ChatInviteSchema } from "@/lib/types/type";

const METHODS = ["GET", "POST", "PUT"];
const HOUR_MS = 60 * 60 * 1000;

const isHours = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_INVITE_HOURS;

const isMaxUses = (value: unknown): value is number | null =>
  value === null ||
  (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_INVITE_USES);

/** Creating or resetting is the only moment the link exists outside the database. */
const rotateInvite = async (
  db: MongoDBClient,
  chatId: string,
  callerId: string,
  body: Record<string, unknown>,
  res: NextApiResponse
) => {
  const hours = body.expiresInHours === undefined ? DEFAULT_INVITE_HOURS : body.expiresInHours;
  const maxUses = body.maxUses === undefined ? null : body.maxUses;
  if (!isHours(hours)) {
    return res.status(400).json({ error: `expiresInHours must be 1-${MAX_INVITE_HOURS}` });
  }
  if (!isMaxUses(maxUses)) {
    return res.status(400).json({ error: `maxUses must be null or 1-${MAX_INVITE_USES}` });
  }

  await ensureChatInviteIndexes(db);
  const token = newInviteToken();
  const now = new Date();
  const invite = await db.chatInvites().findOneAndUpdate(
    { chatId },
    {
      $set: {
        tokenHash: hashInviteToken(token),
        enabled: true,
        createdBy: callerId,
        createdAt: now,
        expiresAt: new Date(now.getTime() + hours * HOUR_MS),
        maxUses,
        uses: 0,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return res.status(200).json({ ...inviteMetadata(invite), link: `/invite/${token}` });
};

const updateInvite = async (
  db: MongoDBClient,
  chatId: string,
  body: Record<string, unknown>,
  res: NextApiResponse
) => {
  const updates: Partial<Pick<ChatInviteSchema, "enabled" | "expiresAt" | "maxUses">> = {};

  if ("enabled" in body) {
    if (typeof body.enabled !== "boolean") {
      return res.status(400).json({ error: "enabled must be a boolean" });
    }
    updates.enabled = body.enabled;
  }
  if ("expiresInHours" in body) {
    if (!isHours(body.expiresInHours)) {
      return res.status(400).json({ error: `expiresInHours must be 1-${MAX_INVITE_HOURS}` });
    }
    updates.expiresAt = new Date(Date.now() + body.expiresInHours * HOUR_MS);
  }
  if ("maxUses" in body) {
    if (!isMaxUses(body.maxUses)) {
      return res.status(400).json({ error: `maxUses must be null or 1-${MAX_INVITE_USES}` });
    }
    updates.maxUses = body.maxUses;
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const invite = await db
    .chatInvites()
    .findOneAndUpdate({ chatId }, { $set: updates }, { returnDocument: "after" });
  if (!invite) {
    return res.status(404).json({ error: "This group has no invite link yet" });
  }
  return res.status(200).json(inviteMetadata(invite));
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!req.method || !METHODS.includes(req.method)) {
    res.setHeader("Allow", METHODS);
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

  let body: Record<string, unknown> = {};
  if (req.method !== "GET") {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({ error: "Invalid request body" });
    }
    body = req.body;
  }

  try {
    const db = await new MongoDBClient().init();
    const chat = await db.chats().findOne({ _id: new ObjectId(id) });
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (chat.chatType !== "Group") {
      return res.status(400).json({ error: "Only group chats have invite links" });
    }
    if (!(await isChatMember(db, id, callerId))) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }
    if (!chat.adminIds?.includes(callerId)) {
      return res.status(403).json({ error: "Only group admins can manage invite links" });
    }

    if (req.method === "GET") {
      const invite = await db.chatInvites().findOne({ chatId: id });
      return res.status(200).json(inviteMetadata(invite));
    }
    return req.method === "POST"
      ? await rotateInvite(db, id, callerId, body, res)
      : await updateInvite(db, id, body, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update the invite link" });
  }
};

export default handler;