/**
 * One-time / maintenance: set `searchText` on Posts_Bookmarks for MongoDB `$text` queries.
 *
 *   npm run backfill:bookmarks
 */
import { ObjectId } from "mongodb";

import { buildBookmarkSearchText } from "../lib/bookmarkSearch";
import { ensurePostBookmarkIndexes } from "../lib/bookmarkIndexes";
import { MongoDBClient } from "../lib/mongodb";
import type { PostSchema } from "../lib/types/type";

async function main() {
  const db = await new MongoDBClient().init();
  const bookmarks = db.postsBookmarks();
  await ensurePostBookmarkIndexes(bookmarks);

  const cursor = bookmarks.find({
    $or: [
      { searchText: { $exists: false } },
      { searchText: "" },
      { searchText: { $type: "null" } },
    ],
  });

  let updated = 0;
  let skipped = 0;

  for await (const b of cursor) {
    const postId = String(b.postId);
    let post =
      ((await db.posts().findOne({ PostID: postId })) as PostSchema | null) ||
      ((await db.postsShares().findOne({ PostID: postId })) as PostSchema | null) ||
      ((await db.postsComments().findOne({ PostID: postId })) as PostSchema | null);

    if (!post) {
      skipped++;
      continue;
    }

    const searchText = buildBookmarkSearchText(post as unknown as Record<string, unknown>);
    await bookmarks.updateOne({ _id: b._id instanceof ObjectId ? b._id : new ObjectId(String(b._id)) }, {
      $set: { searchText },
    });
    updated++;
  }

  console.log(`Backfill complete: updated=${updated}, skipped(no post)=${skipped}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
