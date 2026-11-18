/** Client-safe trends contract. Keep database and other server imports out of this module. */
export const TREND_WINDOW_HOURS = 24;
export const TREND_CACHE_TTL_MS = 5 * 60 * 1000;
export const TREND_MAX_LIMIT = 20;
export const TREND_SIDEBAR_LIMIT = 5;
export const TREND_MIN_AUTHORS = 3;
export const TREND_HASHTAG_PATTERN = "#([A-Za-z0-9_]+)";

export type Trend = {
  /** Lowercase ASCII hashtag, without the leading #. */
  tag: string;
  postCount: number;
  authorCount: number;
};

export type TrendsResponse = {
  data: Trend[];
  windowHours: typeof TREND_WINDOW_HOURS;
  generatedAt: string;
};

/** Match the renderer's #\w+ tokens, including tokens embedded in other text. */
export function extractHashtags(caption: unknown): string[] {
  if (typeof caption !== "string") return [];
  return [
    ...new Set(
      Array.from(caption.matchAll(new RegExp(TREND_HASHTAG_PATTERN, "g")), (match) =>
        match[1].toLowerCase()
      )
    ),
  ];
}

/** Undefined means the sidebar default; malformed/repeated query values fail closed. */
export function parseTrendLimit(value: string | string[] | undefined): number | null {
  if (value === undefined) return TREND_SIDEBAR_LIMIT;
  if (typeof value !== "string" || !value || /[^0-9]/.test(value)) return null;
  const limit = Number(value);
  return Number.isSafeInteger(limit) && limit >= 1 && limit <= TREND_MAX_LIMIT ? limit : null;
}
