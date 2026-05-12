import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import type { Payload } from "@/lib/types/type";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const rawCookie = req.cookies.velo_12;
  const cookie = rawCookie ? decodeURIComponent(rawCookie).replace(/"/g, "") : "";

  let payload: Payload | null = null;
  try {
    payload = cookie ? ((await verifyToken(cookie)) as unknown as Payload) : null;
  } catch {
    // invalid token
  }

  if (!payload?._id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const db = await new MongoDBClient().init();

  // ── GET: list all sessions ──────────────────────────────────────────────────
  if (req.method === "GET") {
    const allTokens = await db
      .tokens()
      .find({ userId: payload._id })
      .sort({ createdAt: -1 })
      .toArray();

    const devices = allTokens.map(({ token, _id, ...rest }) => ({
      ...rest,
      id: _id.toString(),
      isCurrent: token === cookie,
    }));

    return res.status(200).json({ data: devices });
  }

  // ── DELETE: revoke a session ────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const { tokenId } = req.body as { tokenId?: string };
    if (!tokenId) {
      return res.status(400).json({ message: "tokenId is required" });
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(tokenId);
    } catch {
      return res.status(400).json({ message: "Invalid tokenId" });
    }

    const target = await db.tokens().findOne({ _id: objectId, userId: payload._id });

    if (!target) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (target.token === cookie) {
      return res.status(400).json({ message: "Cannot remove the current session" });
    }

    await db.tokens().deleteOne({ _id: objectId });
    return res.status(200).json({ message: "Session removed" });
  }

  return res.status(405).json({ message: "Method Not Allowed" });
}
