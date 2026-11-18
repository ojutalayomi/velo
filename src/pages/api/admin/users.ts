import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { logAdminAction, requireAdmin } from "@/lib/admin";
import { MongoDBClient } from "@/lib/mongodb";

const PAGE_SIZE = 20;
const ACTIONS = {
  verify: { verified: true },
  unverify: { verified: false },
  suspend: { suspended: true },
  unsuspend: { suspended: false },
} as const;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const db = await new MongoDBClient().init();
    const users = db.users();

    if (req.method === "GET") {
      const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 50) : "";
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const filter = q
        ? {
            $or: ["username", "name", "email"].map((f) => ({
              [f]: { $regex: escapeRegex(q), $options: "i" },
            })),
          }
        : {};
      const [items, total] = await Promise.all([
        users
          .find(filter, {
            projection: {
              username: 1, name: 1, email: 1, displayPicture: 1,
              verified: 1, suspended: 1, role: 1, time: 1,
            },
          })
          .sort({ _id: -1 })
          .skip((page - 1) * PAGE_SIZE)
          .limit(PAGE_SIZE)
          .toArray(),
        users.countDocuments(filter),
      ]);
      return res.status(200).json({ data: items, total, page, pageSize: PAGE_SIZE });
    }

    if (req.method === "PATCH") {
      const { id, action } = req.body || {};
      if (typeof id !== "string" || !ObjectId.isValid(id) || !(action in ACTIONS)) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const target = await users.findOne({ _id: new ObjectId(id) });
      if (!target) return res.status(404).json({ message: "User not found" });

      if ((action === "suspend") && (id === admin._id || target.role === "admin")) {
        return res.status(400).json({ message: "Admins cannot be suspended" });
      }

      const set = ACTIONS[action as keyof typeof ACTIONS];
      await users.updateOne({ _id: target._id }, { $set: set });
      await logAdminAction({
        adminId: admin._id,
        action,
        targetId: id,
        details: { username: target.username },
      });
      return res.status(200).json({ data: set });
    }

    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (error) {
    console.error("Admin users error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
