import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { logAdminAction, requireAdmin } from "@/lib/admin";
import { MongoDBClient } from "@/lib/mongodb";
import { emitViaSocketServer } from "@/lib/socket";

const MAX_TITLE = 100;
const MAX_MESSAGE = 500;

const isSafeUrl = (u: string) => u.startsWith("/") && !u.startsWith("//") || /^https:\/\//i.test(u);

function parseFields(body: Record<string, unknown> | undefined) {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const expires = body?.expiresAt ? new Date(String(body.expiresAt)) : null;

  if (!title || title.length > MAX_TITLE || !message || message.length > MAX_MESSAGE) {
    return { error: `Title (max ${MAX_TITLE}) and message (max ${MAX_MESSAGE}) are required` };
  }
  if (url && !isSafeUrl(url)) return { error: "Link must be a relative path or https URL" };
  if (expires && (isNaN(expires.getTime()) || expires.getTime() <= Date.now())) {
    return { error: "Expiry must be a future date" };
  }
  return { title, message, url, expires };
}

/** Live-push to connected users; failures are logged because users still get it on next load. */
async function broadcast(adminId: string, event: "announcement:publish" | "announcement:retire", id: string) {
  try {
    await emitViaSocketServer(adminId, event, { id }, { totalTimeoutMs: 8000 });
  } catch (error) {
    console.error("Announcement broadcast failed:", error);
  }
}

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
      const parsed = parseFields(req.body);
      if ("error" in parsed) return res.status(400).json({ message: parsed.error });
      const { title, message, url, expires } = parsed;

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
      await broadcast(admin._id, "announcement:publish", String(doc._id));
      return res.status(201).json({ data: doc });
    }

    if (req.method === "PUT") {
      const id = req.body?.id;
      if (typeof id !== "string" || !ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const parsed = parseFields(req.body);
      if ("error" in parsed) return res.status(400).json({ message: parsed.error });
      const { title, message, url, expires } = parsed;

      const target = await col.findOne({ _id: new ObjectId(id) });
      if (!target) return res.status(404).json({ message: "Announcement not found" });

      const expiresAt = expires ? expires.toISOString() : null;
      await col.updateOne(
        { _id: target._id },
        url
          ? { $set: { title, message, expiresAt, url } }
          : { $set: { title, message, expiresAt }, $unset: { url: "" } }
      );
      await logAdminAction({
        adminId: admin._id,
        action: "announcement_edit",
        targetId: id,
        details: { title, previousTitle: target.title },
      });
      // Re-broadcast so live viewers see the corrected text (the socket server ignores inactive ones).
      if (target.active) await broadcast(admin._id, "announcement:publish", id);
      return res
        .status(200)
        .json({ data: { ...target, title, message, expiresAt, url: url || undefined } });
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
      await broadcast(admin._id, active ? "announcement:publish" : "announcement:retire", id);
      return res.status(200).json({ data: { active } });
    }

    if (req.method === "DELETE") {
      const id = req.body?.id;
      if (typeof id !== "string" || !ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const target = await col.findOne({ _id: new ObjectId(id) });
      if (!target) return res.status(404).json({ message: "Announcement not found" });
      // Live announcements must be retired first so viewers' banners are cleared.
      if (target.active) {
        return res.status(409).json({ message: "Retire the announcement before deleting it" });
      }
      await col.deleteOne({ _id: target._id, active: false });
      await logAdminAction({
        adminId: admin._id,
        action: "announcement_delete",
        targetId: id,
        details: { title: target.title, message: target.message },
      });
      return res.status(200).json({ data: { deleted: true } });
    }

    res.setHeader("Allow", "GET, POST, PUT, PATCH, DELETE");
    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (error) {
    console.error("Admin announcements error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
