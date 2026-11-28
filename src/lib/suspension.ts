import { ObjectId } from "mongodb";

import { MongoDBClient } from "@/lib/mongodb";

/*
 * A suspended account is locked out of everything: the session cookie stops working, signing in
 * is refused, and the socket server drops the connection.
 *
 * Every authenticated request asks "is this user suspended?", so the answer is remembered for a
 * short while. The window is the longest a suspension can take to bite on another server instance;
 * the admin action clears it on the instance that handled it.
 */
export const SUSPENSION_CACHE_MS = 30_000;
export const SUSPENDED_MESSAGE = "Account suspended";

export class AccountSuspendedError extends Error {
  code = "suspended" as const;
  constructor() {
    super(SUSPENDED_MESSAGE);
    this.name = "AccountSuspendedError";
  }
}

const cache = new Map<string, { suspended: boolean; at: number }>();

export function clearSuspensionCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

/**
 * Whether the user is suspended. `fresh` skips the remembered answer (sign-in, admin changes).
 * If the database cannot be reached the answer is "no": an outage must not lock everyone out.
 */
export async function isUserSuspended(userId: string, options: { fresh?: boolean } = {}): Promise<boolean> {
  if (!userId || !ObjectId.isValid(userId)) return false;
  const known = cache.get(userId);
  if (!options.fresh && known && Date.now() - known.at < SUSPENSION_CACHE_MS) return known.suspended;
  try {
    const db = await new MongoDBClient().init();
    const user = await db.users().findOne({ _id: new ObjectId(userId) }, { projection: { suspended: 1 } });
    const suspended = user?.suspended === true;
    cache.set(userId, { suspended, at: Date.now() });
    return suspended;
  } catch (error) {
    console.error("Suspension check failed:", error);
    return false;
  }
}
