import type { MongoDBClient } from "@/lib/mongodb";

/**
 * Authors whose posts must stay out of `userId`'s feeds: everyone they blocked or muted.
 * Blocking and muting are one-way, so people who blocked or muted *them* are not listed.
 */
export async function getHiddenAuthorIds(db: MongoDBClient, userId: string): Promise<string[]> {
  const [blocked, muted] = await Promise.all([
    db.blockedUsers().find({ blockerId: userId }, { projection: { _id: 0, blockedId: 1 } }).toArray(),
    db.mutedUsers().find({ muterId: userId }, { projection: { _id: 0, mutedId: 1 } }).toArray(),
  ]);
  return [...new Set([...blocked.map((r) => r.blockedId), ...muted.map((r) => r.mutedId)])];
}

/** `$match` fragment that drops those authors; empty when there is nobody to hide. */
export function excludeAuthors(hiddenIds: string[]): Record<string, unknown> {
  return hiddenIds.length ? { UserId: { $nin: hiddenIds } } : {};
}
