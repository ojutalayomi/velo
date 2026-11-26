/**
 * Merges duplicate DMs (several chats between the same two people), backfills `dmKey` on every
 * DM, and builds the unique index that stops new duplicates at the database level.
 *
 * DRY RUN by default: it only prints what it would do. Back up the database, review the output,
 * then run again with --apply.
 *
 *   npx --yes tsx --env-file=.env.local src/scripts/dedupe-dm-chats.ts          # report only
 *   npx --yes tsx --env-file=.env.local src/scripts/dedupe-dm-chats.ts --apply  # make the changes
 *
 * For each pair with more than one DM, the oldest chat survives. The others' messages and read
 * receipts move into it, members' unread counts are added together, and the empty chats and
 * their participant rows are deleted. Open browser tabs keep the old chat ids until reloaded.
 */

import { ObjectId } from "mongodb";

import { CHAT_DM_INDEX_NAME } from "../lib/chatMembership";
import { dmKeyFor, planDmMerge } from "../lib/dmKey";
import { MongoDBClient } from "../lib/mongodb";

const apply = process.argv.includes("--apply");

async function dedupeDmChats() {
  console.log(`DM migration (${apply ? "APPLY" : "dry run - no changes will be made"})`);

  const db = await new MongoDBClient().init();
  const chats = db.chats();
  const participants = db.chatParticipants();

  const dmChats = await chats.find({ chatType: "DM" }, { projection: { _id: 1 } }).toArray();
  const dmIds = dmChats.map((chat) => chat._id.toString());
  const rows = await participants.find({ chatId: { $in: dmIds } }).toArray();

  const membersByChat = new Map<string, string[]>();
  for (const row of rows) {
    membersByChat.set(row.chatId, [...(membersByChat.get(row.chatId) ?? []), row.userId]);
  }

  // Group DMs by pair. A DM that does not have exactly two members cannot be keyed; skip it.
  const byPair = new Map<string, string[]>();
  const skipped: string[] = [];
  for (const chatId of dmIds) {
    const members = Array.from(new Set(membersByChat.get(chatId) ?? []));
    if (members.length !== 2) {
      skipped.push(chatId);
      continue;
    }
    const key = dmKeyFor(members[0], members[1]);
    byPair.set(key, [...(byPair.get(key) ?? []), chatId]);
  }

  const duplicates = [...byPair.entries()].filter(([, ids]) => ids.length > 1);
  console.log(`${dmIds.length} DM chat(s), ${byPair.size} distinct pair(s)`);
  console.log(`${duplicates.length} pair(s) have duplicates`);
  if (skipped.length > 0) {
    console.log(`${skipped.length} DM(s) skipped (not exactly two members): ${skipped.join(", ")}`);
  }

  for (const [key, ids] of duplicates) {
    const { keepId, removeIds } = planDmMerge(ids);
    const messageCount = await db
      .chatMessages()
      .countDocuments({ chatId: { $in: removeIds } });
    console.log(
      `  ${key}: keep ${keepId}, merge ${removeIds.length} duplicate(s) (${removeIds.join(", ")}), moving ${messageCount} message(s)`
    );
    if (!apply) continue;

    for (const removeId of removeIds) {
      // Unread counts add up so nobody loses track of what they have not read.
      for (const row of rows.filter((candidate) => candidate.chatId === removeId)) {
        if (row.unreadCount) {
          await participants.updateOne(
            { chatId: keepId, userId: row.userId },
            { $inc: { unreadCount: row.unreadCount } }
          );
        }
      }
      await db.chatMessages().updateMany({ chatId: removeId }, { $set: { chatId: keepId } });
      await db.readReceipts().updateMany({ chatId: removeId }, { $set: { chatId: keepId } });
      await participants.deleteMany({ chatId: removeId });
      await chats.deleteOne({ _id: new ObjectId(removeId) });
    }

    // Point the surviving chat at the newest message across everything that was merged.
    const newest = await db
      .chatMessages()
      .find({ chatId: keepId })
      .sort({ timestamp: -1, _id: -1 })
      .limit(1)
      .toArray();
    if (newest[0]) {
      const lastMessageId = newest[0]._id.toString();
      await chats.updateOne(
        { _id: new ObjectId(keepId) },
        { $set: { lastMessageId, lastUpdated: newest[0].timestamp } }
      );
      await participants.updateMany(
        { chatId: keepId },
        { $set: { lastMessageId, lastUpdated: newest[0].timestamp } }
      );
    }
  }

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to make these changes.");
    return;
  }

  // Every remaining keyable DM gets its pair key, then the unique index can be built.
  let keyed = 0;
  for (const [key, ids] of byPair) {
    const { keepId } = planDmMerge(ids);
    const result = await chats.updateOne({ _id: new ObjectId(keepId), dmKey: { $exists: false } }, { $set: { dmKey: key } });
    keyed += result.modifiedCount;
  }
  console.log(`✓ Set dmKey on ${keyed} DM chat(s)`);

  const indexName = await chats.createIndex(
    { dmKey: 1 },
    { unique: true, name: CHAT_DM_INDEX_NAME, partialFilterExpression: { dmKey: { $type: "string" } } }
  );
  console.log(`✓ Created index: ${indexName}`);
}

dedupeDmChats()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
