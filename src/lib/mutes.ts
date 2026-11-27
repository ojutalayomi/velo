import { MongoDBClient } from "@/lib/mongodb";

export async function ensureMuteIndexes(db: MongoDBClient): Promise<void> {
  await db.mutedUsers().createIndex({ muterId: 1, mutedId: 1 }, { unique: true });
}

export async function getMutedUserIds(muterId: string): Promise<string[]> {
  const db = await new MongoDBClient().init();
  const rows = await db
    .mutedUsers()
    .find({ muterId }, { projection: { _id: 0, mutedId: 1 } })
    .toArray();
  return rows.map((row) => row.mutedId);
}

export async function muteUser(muterId: string, mutedId: string): Promise<void> {
  const db = await new MongoDBClient().init();
  await ensureMuteIndexes(db);
  await db.mutedUsers().updateOne(
    { muterId, mutedId },
    { $setOnInsert: { muterId, mutedId, createdAt: new Date().toISOString() } },
    { upsert: true }
  );
}

export async function unmuteUser(muterId: string, mutedId: string): Promise<void> {
  const db = await new MongoDBClient().init();
  await db.mutedUsers().deleteOne({ muterId, mutedId });
}
