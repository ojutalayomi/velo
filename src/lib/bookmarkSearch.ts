/**
 * Concatenated text stored on Posts_Bookmarks for MongoDB $text search.
 */
export function buildBookmarkSearchText(post: Record<string, unknown>): string {
  const parts = [post.Caption, post.Username, post.NameOfPoster, post.PostID]
    .filter((v) => v != null && String(v).trim() !== "")
    .map((v) => String(v));
  return parts.join("\n");
}

/**
 * Sanitize user input for MongoDB `$text` `$search` (avoid quotes/backslashes and control chars).
 */
export function sanitizeMongoTextSearch(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/["\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
