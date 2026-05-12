import type { Collection } from "mongodb";
import { PostBookmarkSchema } from "./types/type";

/** Idempotent indexes for Posts_Bookmarks: cursor lists + compound text on user + searchText */
export async function ensurePostBookmarkIndexes(collection: Collection<PostBookmarkSchema>): Promise<void> {
  await collection.createIndexes([
    { key: { userId: 1, _id: -1 }, name: "bookmarks_user_id_cursor" },
    { key: { userId: 1, searchText: "text" }, name: "bookmarks_user_searchText" },
  ]);
}
