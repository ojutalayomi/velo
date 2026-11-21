import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import type { Payload } from "@/lib/types/type";
import { getPrivacySettings, PRIVACY_KEYS } from "@/lib/userPrivacy";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const cookie = decodeURIComponent(req.cookies.velo_12 || "").replace(/"/g, "");
    const payload = cookie ? ((await verifyToken(cookie)) as unknown as Payload | null) : null;
    if (!payload?._id) return res.status(401).json({ message: "Unauthorized" });
    const userId = String(payload._id);

    if (req.method === "PUT") {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const set: Record<string, boolean> = {};
      for (const key of PRIVACY_KEYS) {
        if (body[key] === undefined) continue;
        if (typeof body[key] !== "boolean") {
          return res.status(400).json({ message: `${key} must be a boolean` });
        }
        set[key] = body[key];
      }
      if (!Object.keys(set).length) return res.status(400).json({ message: "Nothing to update" });

      const db = await new MongoDBClient().init();
      await db.userSettings().updateOne(
        { userId },
        { $set: set, $setOnInsert: { userId } },
        { upsert: true }
      );
    }

    return res.status(200).json({ data: await getPrivacySettings(userId) });
  } catch (error) {
    console.error("User settings error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
