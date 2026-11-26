import type { FollowersSchema, MongoDBClient } from "@/lib/mongodb";

/** IDs of every account `userId` follows. */
export async function getFollowedIds(db: MongoDBClient, userId: string): Promise<string[]> {
  const docs = await db
    .followers()
    .find({ followerId: userId }, { projection: { followedId: 1 } })
    .toArray();
  return docs.map((d: FollowersSchema) => d.followedId);
}
