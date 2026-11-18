import type { NextApiRequest, NextApiResponse } from "next";

import { requireAdmin } from "@/lib/admin";
import { MongoDBClient } from "@/lib/mongodb";

const PAGE_SIZE = 25;

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const db = await new MongoDBClient().init();
    const logs = (await db.getDb()).collection("Admin_Audit_Log");
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const [items, total] = await Promise.all([
      logs
        .find({}, { projection: { _id: 0 } })
        .sort({ time: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray(),
      logs.countDocuments(),
    ]);
    return res.status(200).json({ data: items, total, page, pageSize: PAGE_SIZE });
  } catch (error) {
    console.error("Admin audit error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
