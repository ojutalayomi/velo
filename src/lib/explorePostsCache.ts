import type { PaginationMeta } from "@/lib/apiPagination";
import type { PostSchema } from "@/lib/types/type";

/** How long explore grid + status strip reuse cached data without refetching (SPA navigation). */
export const EXPLORE_CACHE_TTL_MS = 5 * 60 * 1000;

export type ExploreCache = {
  posts: PostSchema[];
  pagination: PaginationMeta;
  /** Start of TTL window; only reset on non-merge writes or clear */
  sessionStartedAt: number;
  touchedAt: number;
  statusUrls?: string[];
};

let cache: ExploreCache | null = null;

/** Returns cache only if the session is still within TTL; otherwise clears and returns null. */
export function getExplorePostsCache(): ExploreCache | null {
  if (!cache) return null;
  if (Date.now() - cache.sessionStartedAt > EXPLORE_CACHE_TTL_MS) {
    cache = null;
    return null;
  }
  return cache;
}

/**
 * @param merge When true, keeps the same `sessionStartedAt` and merges optional `statusUrls` if omitted.
 */
export function setExplorePostsCache(
  next: { posts: PostSchema[]; pagination: PaginationMeta; statusUrls?: string[] },
  options?: { merge?: boolean }
): void {
  const prev = cache;
  const merge = options?.merge ?? false;
  const now = Date.now();
  const sessionStartedAt = merge && prev ? prev.sessionStartedAt : now;
  cache = {
    posts: next.posts,
    pagination: next.pagination,
    sessionStartedAt,
    touchedAt: now,
    statusUrls: next.statusUrls ?? (merge ? prev?.statusUrls : undefined),
  };
}

export function clearExplorePostsCache(): void {
  cache = null;
}
