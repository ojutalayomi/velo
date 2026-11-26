/**
 * Recalculate denormalized post counters from source collections.
 *
 * Updates on Posts, Posts_Comments, and Posts_Shares:
 *   NoOfLikes      <- count(Posts_Likes.postId)
 *   NoOfBookmarks  <- count(Posts_Bookmarks.postId)
 *   NoOfShares     <- count(Posts_Shares.OriginalPostId)
 *   NoOfComment    <- count(Posts_Comments.ParentId)
 *
 * Authors are not written here: a post only stores its UserId, and the author's profile is read
 * from the account (see src/lib/postAuthors.ts). Reposts are skipped; they are references and
 * carry no counters of their own.
 *
 * Run with:
 *   npm run backfill:post-counts
 *   # or
 *   npx tsx --env-file=.env.local src/scripts/update-post-counts.ts
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { type AnyBulkWriteOperation, type Collection } from "mongodb";

import type { PostSchema } from "../lib/types/type";

const BATCH_SIZE = 500;

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) continue;
    try {
      loadEnvFile(path);
    } catch {
      // Older Node without loadEnvFile — rely on --env-file CLI flag.
    }
  }
}

async function countByField(
  collection: Collection<any>,
  field: string
): Promise<Map<string, number>> {
  const rows = (await collection
    .aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }])
    .toArray()) as Array<{ _id: string | null; count: number }>;

  const map = new Map<string, number>();
  for (const row of rows) {
    if (row._id == null || row._id === "") continue;
    map.set(String(row._id), row.count);
  }
  return map;
}

type CountMaps = {
  likes: Map<string, number>;
  bookmarks: Map<string, number>;
  shares: Map<string, number>;
  comments: Map<string, number>;
};

function buildUpdate(
  post: PostSchema,
  counts: CountMaps
): AnyBulkWriteOperation<PostSchema> | null {
  const postId = post.PostID;
  if (!postId) return null;

  const next: Partial<PostSchema> = {
    NoOfLikes: counts.likes.get(postId) ?? 0,
    NoOfBookmarks: counts.bookmarks.get(postId) ?? 0,
    NoOfShares: counts.shares.get(postId) ?? 0,
    NoOfComment: counts.comments.get(postId) ?? 0,
  };

  const changed =
    post.NoOfLikes !== next.NoOfLikes ||
    post.NoOfBookmarks !== next.NoOfBookmarks ||
    post.NoOfShares !== next.NoOfShares ||
    post.NoOfComment !== next.NoOfComment;

  if (!changed) return null;

  const filter = post._id != null ? { _id: post._id } : { PostID: postId };

  return {
    updateOne: {
      filter,
      update: { $set: next },
    },
  };
}

async function updateCollection(
  label: string,
  collection: Collection<PostSchema>,
  counts: CountMaps
) {
  let scanned = 0;
  let updated = 0;
  let batch: AnyBulkWriteOperation<PostSchema>[] = [];

  const flush = async () => {
    if (!batch.length) return;
    const result = await collection.bulkWrite(batch, { ordered: false });
    updated += result.modifiedCount;
    batch = [];
  };

  for await (const post of collection.find({})) {
    scanned++;
    if (post.Type === "repost") continue;
    const op = buildUpdate(post, counts);
    if (op) batch.push(op);
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();

  console.log(`  ${label}: scanned=${scanned}, updated=${updated}`);
  return { scanned, updated };
}

async function main() {
  loadEnv();

  if (!process.env.MONGOLINK) {
    throw new Error(
      "MONGOLINK is missing. Run with: npm run backfill:post-counts"
    );
  }

  // Import after env is loaded — mongodb.ts reads MONGOLINK at module init.
  const { MongoDBClient } = await import("../lib/mongodb");

  console.log("Starting post count / backfill...");
  const db = await new MongoDBClient().init();

  console.log("Aggregating likes, bookmarks, shares, comments...");
  const [likes, bookmarks, shares, comments] = await Promise.all([
    countByField(db.postsLikes(), "postId"),
    countByField(db.postsBookmarks(), "postId"),
    countByField(db.postsShares(), "OriginalPostId"),
    countByField(db.postsComments(), "ParentId"),
  ]);

  console.log(
    `Maps: likes=${likes.size}, bookmarks=${bookmarks.size}, shares=${shares.size}, comments=${comments.size}`
  );

  const counts: CountMaps = { likes, bookmarks, shares, comments };

  console.log("Updating collections...");
  const results = await Promise.all([
    updateCollection("Posts", db.posts(), counts),
    updateCollection("Posts_Comments", db.postsComments(), counts),
    updateCollection("Posts_Shares", db.postsShares(), counts),
  ]);

  const scanned = results.reduce((sum, r) => sum + r.scanned, 0);
  const updated = results.reduce((sum, r) => sum + r.updated, 0);
  console.log(`\n✓ Done. scanned=${scanned}, updated=${updated}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Update failed:", error);
  process.exit(1);
});
