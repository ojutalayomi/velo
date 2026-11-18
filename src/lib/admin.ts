import { ObjectId } from "mongodb";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSessionUserId, verifyToken } from "@/lib/auth";
import { MongoDBClient } from "@/lib/mongodb";
import type { Payload } from "@/lib/types/type";

export interface AdminUser {
  _id: string;
  username: string;
}

export const ADMIN_STEPUP_COOKIE = "velo_admin";
export const ADMIN_STEPUP_TTL_SECONDS = 15 * 60;

const secretKey = () => new TextEncoder().encode(process.env.JWT_SECRET);

/** Signs a short-lived proof that this admin recently verified with a passkey. */
export async function signAdminStepUp(adminId: string) {
  return new SignJWT({ adminId, purpose: "admin-stepup" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${ADMIN_STEPUP_TTL_SECONDS}s`)
    .sign(secretKey());
}

async function isStepUpValid(token: string | undefined, adminId: string) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.purpose === "admin-stepup" && payload.adminId === adminId;
  } catch {
    return false;
  }
}

/** For server components: has this admin passed the passkey check recently? */
export async function hasAdminStepUp(adminId: string) {
  const store = await cookies();
  return isStepUpValid(store.get(ADMIN_STEPUP_COOKIE)?.value, adminId);
}

async function loadAdmin(userId: string | null | undefined): Promise<AdminUser | null> {
  if (!userId || !ObjectId.isValid(userId)) return null;
  const db = await new MongoDBClient().init();
  // The role is always read from the database, never from the token.
  const user = await db
    .users()
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { username: 1, role: 1, suspended: 1 } }
    );
  if (!user || user.role !== "admin" || user.suspended) return null;
  return { _id: String(user._id), username: user.username };
}

/** For server components / layouts. Returns null when the viewer is not an admin. */
export async function getAdminUser(): Promise<AdminUser | null> {
  return loadAdmin(await getSessionUserId());
}

/** For Pages Router API routes. Responds with 401/403 and returns null if not an admin. */
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AdminUser | null> {
  const cookie = decodeURIComponent(req.cookies.velo_12 || "").replace(/"/g, "");
  const payload = cookie ? ((await verifyToken(cookie)) as unknown as Payload | null) : null;
  if (!payload?._id) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  const admin = await loadAdmin(String(payload._id));
  if (!admin) {
    res.status(403).json({ message: "Forbidden" });
    return null;
  }
  if (!(await isStepUpValid(req.cookies[ADMIN_STEPUP_COOKIE], admin._id))) {
    res.status(403).json({ message: "Passkey verification required", code: "step_up_required" });
    return null;
  }
  if (rateLimited(admin._id)) {
    res.status(429).json({ message: "Too many requests" });
    return null;
  }
  return admin;
}

// Simple per-admin limiter (in-memory, so per server instance).
const hits = new Map<string, number[]>();
const LIMIT = 60;
const WINDOW_MS = 60_000;

function rateLimited(adminId: string) {
  const now = Date.now();
  const recent = (hits.get(adminId) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(adminId, recent);
  return recent.length > LIMIT;
}

export async function logAdminAction(entry: {
  adminId: string;
  action: string;
  targetId: string;
  details?: Record<string, unknown>;
}) {
  const db = await new MongoDBClient().init();
  await (await db.getDb()).collection("Admin_Audit_Log").insertOne({
    ...entry,
    time: new Date().toISOString(),
  });
}
