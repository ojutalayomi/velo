/**
 * Dedupes Chat_Participants and adds the unique compound index that makes group
 * membership enforceable at the database level.
 *
 * Run with: npx tsx src/scripts/migrations/add-chat-participants-index.ts
 */

import { ObjectId } from "mongodb";

import { CHAT_PARTICIPANT_INDEX_NAME } from "../../lib/chatMembership";
import { MongoDBClient } from "../../lib/mongodb";

async function addChatParticipantsIndex() {
  console.log("Starting migration: unique membership index on Chat_Participants...");

  try {
    const db = await new MongoDBClient().init();
    const participants = db.chatParticipants();

    const duplicates = await participants
      .aggregate<{ _id: { chatId: string; userId: string }; count: number; ids: ObjectId[]; keepId: ObjectId }>([
        {
          $group: {
            _id: { chatId: "$chatId", userId: "$userId" },
            count: { $sum: 1 },
            ids: { $push: "$_id" },
            keepId: { $min: "$_id" },
          },
        },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    let totalRemoved = 0;
    for (const duplicate of duplicates) {
      // ObjectIds are monotonic, so the smallest one is the oldest membership row.
      const idsToDelete = duplicate.ids.filter((id) => !id.equals(duplicate.keepId));
      const result = await participants.deleteMany({ _id: { $in: idsToDelete } });
      totalRemoved += result.deletedCount;
      console.log(
        `  ${duplicate._id.userId} in ${duplicate._id.chatId}: removed ${result.deletedCount} duplicate(s)`
      );
    }
    console.log(
      duplicates.length === 0
        ? "✓ No duplicate memberships found"
        : `✓ Removed ${totalRemoved} duplicate membership row(s)`
    );

    const indexName = await participants.createIndex(
      { chatId: 1, userId: 1 },
      { unique: true, name: CHAT_PARTICIPANT_INDEX_NAME }
    );
    console.log(`✓ Successfully created index: ${indexName}`);

    const indexes = await participants.indexes();
    console.log("\nCurrent indexes on Chat_Participants:");
    indexes.forEach((index) => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });
  } catch (error) {
    console.error("Migration failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  }

  process.exit(0);
}

addChatParticipantsIndex();