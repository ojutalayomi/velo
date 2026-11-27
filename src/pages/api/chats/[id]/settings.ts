import { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { isValidWallpaper } from "@/lib/chatWallpaper";
import { MongoDBClient } from "@/lib/mongodb";

// Only per-user preferences, each with a validator
const SETTING_VALIDATORS: Record<string, (v: unknown) => boolean> = {
  isMuted: (v) => typeof v === "boolean",
  notificationSound: (v) => typeof v === "string" && v.length <= 200,
  notificationVolume: (v) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100,
  // Nothing, a built-in preset, or an image in our own storage: never an arbitrary link or data URL.
  wallpaper: isValidWallpaper,
  theme: (v) => v === "light" || v === "dark",
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const cookie = decodeURIComponent(req.cookies.velo_12 ?? "").replace(/"/g, "");
  if (!cookie) return res.status(401).json({ error: "Unauthorized" });

  const payload = await verifyToken(cookie);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;
  if (typeof id !== "string" || !id) {
    return res.status(400).json({ error: "Invalid chat id" });
  }

  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "Invalid settings" });
  }

  // Accept both bare keys and the client's `chatSettings.*` form
  const normalized: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(body)) {
    const key = rawKey.startsWith("chatSettings.")
      ? rawKey.slice("chatSettings.".length)
      : rawKey;
    normalized[key] = value;
  }

  // Whitelist keys, validate values, and build dotted-path $set for a partial update
  const $set: Record<string, unknown> = {};
  for (const [key, validate] of Object.entries(SETTING_VALIDATORS)) {
    if (!(key in normalized)) continue;
    if (!validate(normalized[key])) {
      return res.status(400).json({ error: `Invalid value for ${key}` });
    }
    $set[`chatSettings.${key}`] = normalized[key];
  }
  if (Object.keys($set).length === 0) {
    return res.status(400).json({ error: "No valid settings provided" });
  }

  try {
    const db = await new MongoDBClient().init();
    const updated = await db.chatParticipants().findOneAndUpdate(
      { chatId: id, userId: String(payload._id) }, // scopes the write to the caller's own row
      { $set },
      { returnDocument: "after", projection: { chatSettings: 1 } }
    );

    // No match: chat doesn't exist or caller isn't a participant
    if (!updated) return res.status(404).json({ error: "Chat not found" });

    return res.status(200).json(updated.chatSettings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update chat settings" });
  }
};

export default handler;