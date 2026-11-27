import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { REPORT_REASONS, ReportDoc } from "@/lib/reports";
import type { Payload } from "@/lib/types/type";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const cookie = decodeURIComponent(req.cookies.velo_12 || "").replace(/"/g, "");
    const payload = cookie ? ((await verifyToken(cookie)) as unknown as Payload | null) : null;
    if (!payload?._id) return res.status(401).json({ message: "Unauthorized" });
    const reporterId = String(payload._id);

    const { type, targetId, targetUserId, reason, details } = req.body || {};
    if (type !== "post" && type !== "user" && type !== "group") {
      return res.status(400).json({ message: "Invalid report type" });
    }
    if (typeof targetId !== "string" || !targetId || targetId.length > 100) {
      return res.status(400).json({ message: "Invalid target" });
    }
    if (!REPORT_REASONS.some((r) => r.value === reason)) {
      return res.status(400).json({ message: "Invalid reason" });
    }
    if (details !== undefined && (typeof details !== "string" || details.length > 500)) {
      return res.status(400).json({ message: "Details too long" });
    }
    if (type === "user" && targetId === reporterId) {
      return res.status(400).json({ message: "You cannot report yourself" });
    }

    const db = await new MongoDBClient().init();

    // A group can only be reported by someone who is in it.
    if (type === "group") {
      const member = await db.chatParticipants().findOne({ chatId: targetId, userId: reporterId }, { projection: { _id: 1 } });
      if (!member) return res.status(403).json({ message: "You can only report a group you are in" });
    }

    const reports = (await db.getDb()).collection<ReportDoc>("Reports");

    // One report per reporter per target.
    const existing = await reports.findOne({ reporterId, type, targetId });
    if (existing) return res.status(200).json({ message: "Already reported" });

    await reports.insertOne({
      type,
      targetId,
      targetUserId: typeof targetUserId === "string" ? targetUserId : undefined,
      reporterId,
      reason,
      details: details?.trim() || undefined,
      status: "open",
      time: new Date().toISOString(),
    });
    return res.status(201).json({ message: "Report submitted" });
  } catch (error) {
    console.error("Report error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
