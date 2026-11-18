import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { logAdminAction, requireAdmin } from "@/lib/admin";
import { MongoDBClient } from "@/lib/mongodb";
import type { ReportDoc } from "@/lib/reports";

const PAGE_SIZE = 20;
const STATUSES = ["open", "resolved", "dismissed"];

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const db = await new MongoDBClient().init();
    const reports = (await db.getDb()).collection<ReportDoc>("Reports");

    if (req.method === "GET") {
      const status = typeof req.query.status === "string" ? req.query.status : "open";
      if (!STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status" });
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);

      const [items, total] = await Promise.all([
        reports
          .find({ status } as object)
          .sort({ time: -1 })
          .skip((page - 1) * PAGE_SIZE)
          .limit(PAGE_SIZE)
          .toArray(),
        reports.countDocuments({ status } as object),
      ]);

      // Attach the reported user's username for display.
      const ids = [...new Set(items.map((r) => r.targetUserId || (r.type === "user" ? r.targetId : "")))]
        .filter((id) => id && ObjectId.isValid(id))
        .map((id) => new ObjectId(id));
      const found = ids.length
        ? await db.users().find({ _id: { $in: ids } }, { projection: { username: 1 } }).toArray()
        : [];
      const names = new Map(found.map((u) => [String(u._id), u.username]));

      return res.status(200).json({
        data: items.map((r) => ({
          ...r,
          _id: String(r._id),
          targetUsername: names.get(r.targetUserId || (r.type === "user" ? r.targetId : "")),
        })),
        total,
        page,
        pageSize: PAGE_SIZE,
      });
    }

    if (req.method === "PATCH") {
      const { id, status } = req.body || {};
      if (typeof id !== "string" || !ObjectId.isValid(id) || !["resolved", "dismissed"].includes(status)) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const result = await reports.updateOne(
        { _id: new ObjectId(id) } as object,
        { $set: { status, reviewedBy: admin._id, reviewedAt: new Date().toISOString() } }
      );
      if (!result.matchedCount) return res.status(404).json({ message: "Report not found" });
      await logAdminAction({ adminId: admin._id, action: `report_${status}`, targetId: id });
      return res.status(200).json({ data: { status } });
    }

    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (error) {
    console.error("Admin reports error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
