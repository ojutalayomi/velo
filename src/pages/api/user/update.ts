import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import { Payload } from "@/lib/types/type";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const RESERVED_USERNAMES = new Set([
  "home", "explore", "chats", "compose", "accounts", "general", "notifications",
  "bookmarks", "api", "settings", "edit", "admin", "login", "signup", "logout",
]);

type Validator = (_value: unknown) => string | null; // returns an error message or null

const isString = (v: unknown): v is string => typeof v === "string";
const imageUrl = (v: unknown) => isString(v) && /^https?:\/\/\S+$/.test(v);

const validators: Record<string, Validator> = {
  name: (v) =>
    !isString(v) || !v.trim() || v.trim().length > 50 ? "Name must be 1-50 characters" : null,
  bio: (v) => (!isString(v) || v.length > 160 ? "Bio must be at most 160 characters" : null),
  location: (v) =>
    !isString(v) || v.length > 30 ? "Location must be at most 30 characters" : null,
  website: (v) => {
    if (!isString(v) || v.length > 200) return "Invalid website";
    if (!v.trim()) return null;
    try {
      const u = new URL(v.trim());
      return u.protocol === "http:" || u.protocol === "https:" ? null : "Invalid website";
    } catch {
      return "Invalid website";
    }
  },
  displayPicture: (v) => (v === "" || imageUrl(v) ? null : "Invalid profile picture URL"),
  coverPhoto: (v) => (v === "" || imageUrl(v) ? null : "Invalid cover photo URL"),
  dob: (v) => {
    if (!isString(v)) return "Invalid date of birth";
    if (v === "") return null;
    const d = new Date(v);
    const now = new Date();
    if (isNaN(d.getTime()) || d > now || d.getFullYear() < now.getFullYear() - 120)
      return "Invalid date of birth";
    return null;
  },
  isPrivate: (v) => (typeof v === "boolean" ? null : "isPrivate must be a boolean"),
  theme: (v) =>
    v === "light" || v === "dark" || v === "system" ? null : "Invalid theme",
  username: (v) =>
    !isString(v) || !USERNAME_REGEX.test(v)
      ? "Username must be 3-20 letters, numbers or underscores"
      : null,
};

// Only these keys can ever be written by a client.
const EDITABLE = Object.keys(validators);

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const cookie = decodeURIComponent(req.cookies.velo_12 ? req.cookies.velo_12 : "").replace(
      /"/g,
      ""
    );
    const payload = (await verifyToken(cookie)) as unknown as Payload;
    if (!payload) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const set: Record<string, unknown> = {};

    // Apply only fields that were actually sent, validating each one.
    for (const key of EDITABLE) {
      if (body[key] === undefined) continue;
      const error = validators[key](body[key]);
      if (error) return res.status(400).json({ message: error });
      set[key] = isString(body[key]) ? (body[key] as string).trim() : body[key];
    }

    // Keep firstname/lastname in sync with name (first word / the rest).
    if (typeof set.name === "string") {
      const [first, ...rest] = (set.name as string).split(/\s+/);
      set.firstname = first;
      set.lastname = rest.join(" ");
    }

    if (!Object.keys(set).length) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const db = await new MongoDBClient().init();
    const users = db.users();
    const _id = new ObjectId(payload._id);

    const currentUser = await users.findOne({ _id });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Username changes: unique, not reserved, and rate-limited.
    if (typeof set.username === "string" && set.username !== currentUser.username) {
      const username = set.username as string;
      if (RESERVED_USERNAMES.has(username.toLowerCase())) {
        return res.status(400).json({ message: "That username is not available" });
      }
      const last = (currentUser as { usernameChangedAt?: string }).usernameChangedAt;
      if (last && Date.now() - new Date(last).getTime() < USERNAME_COOLDOWN_MS) {
        return res
          .status(429)
          .json({ message: "You can only change your username once every 30 days" });
      }
      const taken = await users.findOne({
        username: { $regex: `^${username}$`, $options: "i" },
        _id: { $ne: _id },
      });
      if (taken) {
        return res.status(409).json({ message: "That username is not available" });
      }
      set.usernameChangedAt = new Date().toISOString();
    } else {
      delete set.username;
    }

    const lastUpdate = currentUser.lastUpdate || [];
    lastUpdate.push(new Date().toISOString());

    await users.updateOne(
      { _id },
      {
        $set: { ...set, lastUpdate, noOfUpdates: (currentUser.noOfUpdates || 0) + 1 },
      }
    );

    const updatedUser = await users.findOne(
      { _id },
      {
        projection: {
          password: 0,
          confirmationToken: 0,
          signUpCount: 0,
          loginToken: 0,
          password_reset_time: 0,
          lastResetAttempt: 0,
          resetAttempts: 0,
          resetToken: 0,
          resetTokenExpiry: 0,
          passkeys: 0,
        },
      }
    );

    return res.status(200).json({ data: updatedUser, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
