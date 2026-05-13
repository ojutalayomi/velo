import { MongoDBClient } from "@/lib/mongodb";
import type { PostSchema } from "@/lib/types/type";

/** Escape user input for safe use inside a MongoDB `$regex` pattern. */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type CaptionSearchKind = "hashtag" | "text";

/**
 * Build a case-insensitive regex for caption search.
 * - `hashtag`: match literal `#tag` as a token (word boundary after tag).
 * - `text`: substring match (escaped).
 */
export function buildCaptionRegex(kind: CaptionSearchKind, raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (kind === "hashtag") {
    return `#${escapeRegex(trimmed)}\\b`;
  }
  return escapeRegex(trimmed);
}

export async function fetchPostsByCaptionMatch(
  db: MongoDBClient,
  opts: {
    kind: CaptionSearchKind;
    term: string;
    skip: number;
    limit: number;
  }
): Promise<{ posts: PostSchema[]; hasMore: boolean }> {
  const pattern = buildCaptionRegex(opts.kind, opts.term);
  if (!pattern) {
    return { posts: [], hasMore: false };
  }

  const database = await new MongoDBClient().init();
  const fetchLimit = opts.limit + 1;

  const cursor = database.posts().aggregate([
    { $unionWith: { coll: "Posts_Shares", pipeline: [] } },
    { $unionWith: { coll: "Posts_Comments", pipeline: [] } },
    {
      $match: {
        Caption: { $regex: pattern, $options: "i" },
      },
    },
    { $sort: { TimeOfPost: -1 } },
    { $skip: opts.skip },
    { $limit: fetchLimit },
  ]);

  const batch = await cursor.toArray();
  const hasMore = batch.length > opts.limit;
  const posts = batch.slice(0, opts.limit) as unknown as PostSchema[];

  return { posts, hasMore };
}
