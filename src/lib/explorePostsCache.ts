import type { PaginationMeta } from "@/lib/apiPagination";
import type { PostSchema } from "@/lib/types/type";

type ExploreCache = {
  posts: PostSchema[];
  pagination: PaginationMeta;
  createdAt: number;
};

let cache: ExploreCache | null = null;

export function getExplorePostsCache(): ExploreCache | null {
  return cache;
}

export function setExplorePostsCache(next: { posts: PostSchema[]; pagination: PaginationMeta }) {
  cache = { ...next, createdAt: Date.now() };
}

export function clearExplorePostsCache() {
  cache = null;
}

