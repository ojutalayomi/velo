import { ObjectId } from "mongodb";

import type { MongoDBClient } from "@/lib/mongodb";

export type RelatedUser = {
  _id: string;
  name: string;
  username: string;
  displayPicture: string;
  verified: boolean;
  /** When the person was muted or blocked. */
  since: string;
};

/**
 * The accounts behind a mute or block list, newest first, with just what a list row shows. People
 * whose account no longer exists are left out, so there is never an entry that can't be undone.
 */
export async function relatedUsers(
  db: MongoDBClient,
  rows: { id: string; createdAt: string }[]
): Promise<RelatedUser[]> {
  const valid = rows.filter((row) => ObjectId.isValid(row.id));
  if (valid.length === 0) return [];
  const users = await db
    .users()
    .find(
      { _id: { $in: valid.map((row) => new ObjectId(row.id)) } },
      { projection: { name: 1, firstname: 1, lastname: 1, username: 1, displayPicture: 1, verified: 1 } }
    )
    .toArray();
  const byId = new Map(users.map((user) => [String(user._id), user]));

  return valid
    .filter((row) => byId.has(row.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((row) => {
      const user = byId.get(row.id)!;
      const full = `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim();
      return {
        _id: row.id,
        name: String(user.name || full || user.username || ""),
        username: String(user.username ?? ""),
        displayPicture: String(user.displayPicture ?? ""),
        verified: user.verified === true,
        since: row.createdAt,
      };
    });
}
