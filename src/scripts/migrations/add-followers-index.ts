/**
 * Database migration script to add a unique compound index on the Followers collection.
 * This prevents duplicate follow relationships at the database level.
 *
 * Run with: npx tsx src/scripts/migrations/add-followers-index.ts
 */

import { MongoDBClient } from "../../lib/mongodb";

async function addFollowersIndex() {
  console.log("Starting migration: Adding unique index to Followers collection...");

  try {
    const db = await new MongoDBClient().init();
    const followers = db.followers();

    // Create a unique compound index on followerId and followedId
    // This ensures no duplicate follow relationships can exist
    const indexName = await followers.createIndex(
      { followerId: 1, followedId: 1 },
      {
        unique: true,
        name: "unique_follower_followed"
      }
    );

    console.log(`✓ Successfully created index: ${indexName}`);
    console.log("Migration completed successfully!");

    // Verify the index
    const indexes = await followers.indexes();
    console.log("\nCurrent indexes on Followers collection:");
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

addFollowersIndex();
