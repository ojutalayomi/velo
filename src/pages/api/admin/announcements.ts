import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { logAdminAction, requireAdmin } from "@/lib/admin";
import { MongoDBClient } from "@/lib/mongodb";

const MAX_TITLE = 100;
const MAX_MESSAGE = 500;

const isSafeUrl = (u: string) => u.startsWith("/") && !u.startsWith("//") || /^https:\/\//i.test(u);

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const db = await new MongoDBClient().init();
    const col = db.announcements();

    if (req.method === "GET") {
      const items = await col.find({}).sort({ _id: -1 }).limit(50).toArray();
      return res.status(200).json({ data: items });
    }

    if (req.method === "POST") {
      const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
      const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
      const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
      const expires = req.body?.expiresAt ? new Date(req.body.expiresAt) : null;

      if (!title || title.length > MAX_TITLE || !message || message.length > MAX_MESSAGE) {
        return res.status(400).json({
          message: `Title (max ${MAX_TITLE}) and message (max ${MAX_MESSAGE}) are required`,
        });
      }
      if (url && !isSafeUrl(url)) {
        return res.status(400).json({ message: "Link must be a relative path or https URL" });
      }
      if (expires && (isNaN(expires.getTime()) || expires.getTime() <= Date.now())) {
        return res.status(400).json({ message: "Expiry must be a future date" });
      }

      const doc = {
        _id: new ObjectId(),
        title,
        message,
        ...(url && { url }),
        active: true,
        createdBy: admin._id,
        createdAt: new Date().toISOString(),
        expiresAt: expires ? expires.toISOString() : null,
      };
      await col.insertOne(doc);
      await logAdminAction({
        adminId: admin._id,
        action: "announce",
        targetId: String(doc._id),
        details: { title },
      });
      return res.status(201).json({ data: doc });
    }

    if (req.method === "PATCH") {
      const { id, active } = req.body || {};
      if (typeof id !== "string" || !ObjectId.isValid(id) || typeof active !== "boolean") {
        return res.status(400).json({ message: "Invalid request" });
      }
      const target = await col.findOne({ _id: new ObjectId(id) });
      if (!target) return res.status(404).json({ message: "Announcement not found" });
      await col.updateOne({ _id: target._id }, { $set: { active } });
      await logAdminAction({
        adminId: admin._id,
        action: active ? "announcement_republish" : "announcement_retire",
        targetId: id,
        details: { title: target.title },
      });
      return res.status(200).json({ data: { active } });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (error) {
    console.error("Admin announcements error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
