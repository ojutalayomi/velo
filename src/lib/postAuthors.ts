import { ObjectId } from "mongodb";

import type { MongoDBClient } from "@/lib/mongodb";

import { withAuthor, type PostAuthorFields } from "./postAuthor";
import type { Account } from "./senderProfile";

export { withAuthor, withoutAuthor } from "./postAuthor";

/**
 * Fills in each post's (or comment's, or share's) author from the user's current account, in one
 * query for the whole page. Posts only store the UserId; names, pictures and the badge change.
 */
export async function withAuthors<T extends { UserId?: string } & Partial<PostAuthorFields>>(
  db: MongoDBClient,
  posts: T[]
): Promise<(T & PostAuthorFields)[]> {
  const ids = Array.from(
    new Set(posts.map((p) => p.UserId).filter((id): id is string => !!id && ObjectId.isValid(id)))
  );
  const accounts = new Map<string, Account>();
  if (ids.length > 0) {
    const users = await db
      .users()
      .find(
        { _id: { $in: ids.map((id) => new ObjectId(id)) } },
        { projection: { name: 1, firstname: 1, lastname: 1, username: 1, displayPicture: 1, verified: 1 } }
      )
      .toArray();
    for (const user of users) accounts.set(String(user._id), user as unknown as Account);
  }
  return posts.map((post) => withAuthor(post, post.UserId ? accounts.get(post.UserId) : undefined));
}
