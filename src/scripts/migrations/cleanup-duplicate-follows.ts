/**
 * Cleanup script to remove duplicate follow relationships before adding the unique index.
 * This script finds and removes duplicate follower-followed pairs, keeping only the oldest one.
 * 
 * Run with: npx tsx src/scripts/migrations/cleanup-duplicate-follows.ts
 */

import { MongoDBClient } from "../../lib/mongodb";

async function cleanupDuplicateFollows() {
  console.log("Starting cleanup: Removing duplicate follow relationships...");

  try {
    const db = await new MongoDBClient().init();
    const followers = db.followers();

    // Find all duplicate follow relationships
    const duplicates = await followers
      .aggregate([
        {
          $group: {
            _id: { followerId: "$followerId", followedId: "$followedId" },
            count: { $sum: 1 },
            ids: { $push: "$_id" },
            times: { $push: "$time" },
          },
        },
        {
          $match: {
            count: { $gt: 1 },
          },
        },
      ])
      .toArray();

    if (duplicates.length === 0) {
      console.log("✓ No duplicate follow relationships found!");
      process.exit(0);
    }

    console.log(`Found ${duplicates.length} duplicate follow relationships`);

    let totalRemoved = 0;

    // Remove duplicates, keeping the oldest one (first in the times array)
    for (const dup of duplicates) {
      const { followerId, followedId } = dup._id;
      const ids = dup.ids as any[];
      const times = dup.times as string[];

      console.log(
        `\nProcessing duplicate: ${followerId} -> ${followedId} (${dup.count} instances)`
      );

      // Find the oldest record
      const oldestIndex = times.reduce(
        (minIdx, time, idx) => (time < times[minIdx] ? idx : minIdx),
        0
      );

      // Delete all except the oldest
      const idsToDelete = ids.filter((_, idx) => idx !== oldestIndex);

      const deleteResult = await followers.deleteMany({
        _id: { $in: idsToDelete },
      });

      console.log(`  Kept: ${times[oldestIndex]}`);
      console.log(`  Removed: ${deleteResult.deletedCount} duplicate(s)`);

      totalRemoved += deleteResult.deletedCount;
    }

    console.log(`\n✓ Cleanup completed! Removed ${totalRemoved} duplicate follow relationships.`);
    console.log("You can now run the add-followers-index script to create the unique index.");

  } catch (error) {
    console.error("Cleanup failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  }

  process.exit(0);
}

cleanupDuplicateFollows();
