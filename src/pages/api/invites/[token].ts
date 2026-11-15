import { ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import {
  claimInviteSlot,
  hashInviteToken,
  inviteBlockReason,
  isInviteToken,
  refundInviteSlot,
} from "@/lib/chatInvites";
import {
  ensureChatParticipantIndexes,
  isChatMember,
  isDuplicateMemberError,
} from "@/lib/chatMembership";
import { MongoDBClient } from "@/lib/mongodb";
import { emitViaSocketServer } from "@/lib/socket";
import { ChatParticipant, InviteBlockReason, NewChatSettings } from "@/lib/types/type";

const METHODS = ["GET", "POST"];

const REASON_MESSAGES: Record<InviteBlockReason, string> = {
  not_found: "This invite link is not valid",
  expired: "This invite link has expired",
  disabled: "This invite link was turned off",
  full: "This invite link has reached its join limit",
};

const rejectReason = (res: NextApiResponse, reason: InviteBlockReason) =>
  res
    .status(reason === "not_found" ? 404 : 410)
    .json({ error: REASON_MESSAGES[reason], reason });

/** Read-only preview, safe to render for someone who is not signed in. */
const preview = async (
  db: MongoDBClient,
  tokenHash: string,
  callerId: string | null,
  res: NextApiResponse
) => {
  const invite = await db.chatInvites().findOne({ tokenHash });
  const chat = invite ? await db.chats().findOne({ _id: new ObjectId(invite.chatId) }) : null;
  if (!chat || chat.chatType !== "Group") {
    return res.status(200).json({
      valid: false,
      reason: "not_found",
      chatId: "",
      name: "",
      displayPicture: "",
      memberCount: 0,
      isMember: false,
    });
  }

  const chatId = chat._id.toString();
  const reason = inviteBlockReason(invite);
  const memberCount = await db.chatParticipants().countDocuments({ chatId });
  return res.status(200).json({
    valid: reason === null,
    reason,
    chatId,
    name: chat.name?.group ?? "",
    displayPicture: chat.groupDisplayPicture ?? "",
    memberCount,
    isMember: callerId ? await isChatMember(db, chatId, callerId) : false,
  });
};

const join = async (
  db: MongoDBClient,
  tokenHash: string,
  callerId: string,
  res: NextApiResponse
) => {
  const invite = await db.chatInvites().findOne({ tokenHash });
  if (!invite) return rejectReason(res, "not_found");

  const reason = inviteBlockReason(invite);
  if (reason) return rejectReason(res, reason);

  const chatId = invite.chatId;
  const chat = await db.chats().findOne({ _id: new ObjectId(chatId) });
  if (!chat || chat.chatType !== "Group") return rejectReason(res, "not_found");

  // Re-clicking a link never burns a use, so membership is checked before the cap.
  if (await isChatMember(db, chatId, callerId)) {
    return res.status(200).json({ chatId, alreadyMember: true });
  }

  const user = await db.users().findOne({ _id: new ObjectId(callerId) });
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const existing = await db.chatParticipants().find({ chatId }).toArray();
  const chatSettings: NewChatSettings = {
    _id: new ObjectId(),
    chatId,
    isMuted: false,
    isPinned: false,
    isArchived: false,
    notificationSound: "",
    notificationVolume: 0,
    wallpaper: "",
    theme: "light",
    members: [...existing.map((participant) => participant.userId), callerId],
    isBlocked: false,
    lastSeen: new Date().toISOString(),
  };
  const row: ChatParticipant = {
    _id: new ObjectId(),
    chatId,
    unreadCount: 0,
    favorite: false,
    pinned: false,
    deleted: false,
    archived: false,
    chatSettings,
    displayPicture: user.displayPicture ?? "",
    userId: callerId,
    chatType: "Group",
  };
  await ensureChatParticipantIndexes(db);

  const claimed = await claimInviteSlot(db, tokenHash);
  if (!claimed) {
    const current = await db.chatInvites().findOne({ tokenHash });
    return rejectReason(res, inviteBlockReason(current) ?? "full");
  }

  let alreadyMember = false;
  try {
    await db.chatParticipants().insertMany([row]);
  } catch (error) {
    if (!isDuplicateMemberError(error)) {
      await refundInviteSlot(db, tokenHash);
      throw error;
    }
    // Someone else added this user between the membership check and the insert.
    alreadyMember = true;
  }

  if (alreadyMember) {
    await refundInviteSlot(db, tokenHash);
    return res.status(200).json({ chatId, alreadyMember: true });
  }

  try {
    await emitViaSocketServer(callerId, "chat:participantsAdded", {
      chatId,
      addedUserIds: [callerId],
    });
  } catch (error) {
    console.error("Failed to announce the new group member:", error);
  }

  return res.status(200).json({ chatId, alreadyMember: false });
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!req.method || !METHODS.includes(req.method)) {
    res.setHeader("Allow", METHODS);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { token } = req.query;
  if (!isInviteToken(token)) return rejectReason(res, "not_found");
  const tokenHash = hashInviteToken(token);

  const cookie = decodeURIComponent(req.cookies.velo_12 ?? "").replace(/"/g, "");
  const payload = cookie ? await verifyToken(cookie) : null;
  const callerId = payload ? String(payload._id) : null;

  try {
    const db = await new MongoDBClient().init();
    if (req.method === "GET") return await preview(db, tokenHash, callerId, res);
    if (!callerId) return res.status(401).json({ error: "Unauthorized" });
    return await join(db, tokenHash, callerId, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to join the group" });
  }
};

export default handler;