import type { NextApiRequest } from "next";

export const DEFAULT_POST_LIMIT = 40;
export const DEFAULT_MESSAGE_LIMIT = 400;
export const DEFAULT_COMMENT_LIMIT = 60;
export const DEFAULT_STATUS_LIMIT = 80;
export const MAX_API_LIMIT = 100;

export type PaginationMeta = {
  limit: number;
  skip: number;
  hasMore: boolean;
  /** Opaque cursor for cursor-based APIs (e.g. bookmark `_id` hex). */
  nextCursor?: string | null;
};

export function parsePaging(
  req: Pick<NextApiRequest, "query">,
  keys: {
    skipKey?: string;
    limitKey?: string;
    pageKey?: string;
    defaultLimit?: number;
    maxLimit?: number;
  } = {}
): { limit: number; skip: number } {
  const {
    skipKey = "skip",
    limitKey = "limit",
    pageKey = "page",
    defaultLimit = DEFAULT_POST_LIMIT,
    maxLimit = MAX_API_LIMIT,
  } = keys;

  const q = req.query;
  let limit = defaultLimit;

  const rawLimit = q[limitKey];
  if (rawLimit !== undefined && rawLimit !== "") {
    const n = parseInt(String(Array.isArray(rawLimit) ? rawLimit[0] : rawLimit), 10);
    if (!Number.isNaN(n) && n > 0) limit = Math.min(Math.floor(n), maxLimit);
  }

  let skip = 0;

  const rawSkip = q[skipKey];
  if (rawSkip !== undefined && rawSkip !== "") {
    const n = parseInt(String(Array.isArray(rawSkip) ? rawSkip[0] : rawSkip), 10);
    if (!Number.isNaN(n) && n >= 0) skip = Math.floor(n);
  } else {
    const rawPage = q[pageKey];
    if (rawPage !== undefined && rawPage !== "") {
      const page = parseInt(String(Array.isArray(rawPage) ? rawPage[0] : rawPage), 10);
      if (!Number.isNaN(page) && page >= 1) skip = (page - 1) * limit;
    }
  }

  return { limit, skip };
}

export function pagingMeta(
  skip: number,
  limit: number,
  hasMore: boolean,
  nextCursor?: string | null
): PaginationMeta {
  const meta: PaginationMeta = { skip, limit, hasMore };
  if (nextCursor !== undefined) {
    meta.nextCursor = nextCursor;
  }
  return meta;
}
