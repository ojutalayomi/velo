import { MongoDBClient } from "@/lib/mongodb";

export async function ensureBlockIndexes(db: MongoDBClient): Promise<void> {
  await Promise.all([
    db.blockedUsers().createIndex({ blockerId: 1, blockedId: 1 }, { unique: true }),
    db.blockedUsers().createIndex({ blockedId: 1 }),
  ]);
}

export async function getBlockedUserIds(blockerId: string): Promise<string[]> {
  const db = await new MongoDBClient().init();
  const rows = await db
    .blockedUsers()
    .find({ blockerId }, { projection: { _id: 0, blockedId: 1 } })
    .toArray();
  return rows.map((row) => row.blockedId);
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const db = await new MongoDBClient().init();
  await ensureBlockIndexes(db);
  await db.blockedUsers().updateOne(
    { blockerId, blockedId },
    {
      $setOnInsert: {
        blockerId,
        blockedId,
        createdAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const db = await new MongoDBClient().init();
  await db.blockedUsers().deleteOne({ blockerId, blockedId });
}

export async function hasBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const db = await new MongoDBClient().init();
  const row = await db.blockedUsers().findOne({ blockerId, blockedId }, { projection: { _id: 1 } });
  return Boolean(row);
}
