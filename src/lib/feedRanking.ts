/**
 * Feed ranking.
 *
 * One scoring formula, expressed twice so it can be tested and run where the data lives:
 *  - `scorePost` is the plain TypeScript reference implementation (unit tested).
 *  - `buildRankingStages` emits the equivalent MongoDB aggregation stages.
 *
 *   score = (1 + weightedEngagement) * authorBoost / (ageHours + AGE_OFFSET_HOURS) ^ gravity
 *
 * Signals are limited to what is already stored on posts (counts, timestamp) plus the
 * viewer's follow list. Analytics v2 (views/dwell) is deliberately not used; see postAnalytics.md.
 */

export type FeedMode = "forYou" | "following" | "hot" | "popular";

export interface RankingWeights {
  like: number;
  comment: number;
  share: number;
  bookmark: number;
}

export interface ModeConfig {
  /** Time-decay exponent. Higher = fresher posts win more. 0 disables decay. */
  gravity: number;
  /** Multiplier applied to posts by followed authors. */
  followBoost: number;
  /**
   * Extra multiplier for brand-new posts, fading linearly to nothing over
   * FRESHNESS_WINDOW_HOURS: factor = 1 + freshnessBoost * (1 - age / window). 0 disables it.
   */
  freshnessBoost: number;
}

export const ENGAGEMENT_WEIGHTS: RankingWeights = { like: 1, comment: 2, share: 3, bookmark: 2 };

/** Keeps brand-new posts from dividing by ~0 and exploding. */
export const AGE_OFFSET_HOURS = 2;

/**
 * A missing or unparseable TimeOfPost counts as this old: such posts get no freshness bonus and
 * sink with age, rather than sitting at "age 0" (which would pin them to the top forever).
 */
export const UNKNOWN_DATE_AGE_HOURS = 24 * 365;

/** How long a post counts as "new" for the freshness bonus. */
export const FRESHNESS_WINDOW_HOURS = 3;

export const MODE_CONFIG: Record<FeedMode, ModeConfig> = {
  // Mix of people you follow and everyone else; followed authors get a lift, and posts from the
  // last few hours get a bonus so a new post is seen before it has had time to earn engagement.
  forYou: { gravity: 1.5, followBoost: 1.6, freshnessBoost: 2 },
  // Everyone is followed already, so only engagement vs. age matters. People expect this feed to
  // be roughly chronological, so decay is as strong as For you (1.1 let 6-month-old posts win).
  following: { gravity: 1.5, followBoost: 1, freshnessBoost: 2 },
  // Trending right now.
  hot: { gravity: 1.8, followBoost: 1, freshnessBoost: 0 },
  // All-time most engaged.
  popular: { gravity: 0, followBoost: 1, freshnessBoost: 0 },
};

/**
 * Server "now" is rounded down to this bucket so successive pages of one scroll session
 * are scored against (nearly) the same instant and skip/limit paging stays stable.
 */
export const SCORE_TIME_BUCKET_MS = 5 * 60 * 1000;

export function bucketNow(now: number = Date.now()): number {
  return Math.floor(now / SCORE_TIME_BUCKET_MS) * SCORE_TIME_BUCKET_MS;
}

export interface RankablePost {
  _id?: { toString(): string } | string;
  UserId?: string;
  TimeOfPost?: string;
  NoOfLikes?: number | null;
  NoOfComment?: number | null;
  NoOfShares?: number | null;
  NoOfBookmarks?: number | null;
}

function count(n: number | null | undefined): number {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;
}

export function weightedEngagement(post: RankablePost, w: RankingWeights = ENGAGEMENT_WEIGHTS): number {
  return (
    count(post.NoOfLikes) * w.like +
    count(post.NoOfComment) * w.comment +
    count(post.NoOfShares) * w.share +
    count(post.NoOfBookmarks) * w.bookmark
  );
}

export interface ScoreContext {
  mode: FeedMode;
  now: number;
  followedIds?: ReadonlySet<string>;
}

export function freshnessFactor(ageHours: number, freshnessBoost: number): number {
  return 1 + freshnessBoost * Math.max(0, 1 - ageHours / FRESHNESS_WINDOW_HOURS);
}

/** Reference implementation of the ranking formula. */
export function scorePost(post: RankablePost, ctx: ScoreContext): number {
  const { gravity, followBoost, freshnessBoost } = MODE_CONFIG[ctx.mode];
  const posted = post.TimeOfPost ? Date.parse(post.TimeOfPost) : NaN;
  const ageHours = Number.isNaN(posted)
    ? UNKNOWN_DATE_AGE_HOURS
    : Math.max(0, (ctx.now - posted) / 3_600_000);
  const boost = post.UserId && ctx.followedIds?.has(post.UserId) ? followBoost : 1;
  const fresh = freshnessFactor(ageHours, freshnessBoost);
  return (
    ((1 + weightedEngagement(post)) * boost * fresh) / Math.pow(ageHours + AGE_OFFSET_HOURS, gravity)
  );
}

/**
 * Sorts a list by the reference formula. Ties break on TimeOfPost then _id, newest/highest first,
 * exactly like the Mongo $sort in buildRankingStages. Handy for tests and small sets.
 */
export function rankPosts<T extends RankablePost>(posts: readonly T[], ctx: ScoreContext): T[] {
  return posts
    .map((post) => ({ post, score: scorePost(post, ctx) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.post.TimeOfPost ?? "").localeCompare(a.post.TimeOfPost ?? "") ||
        String(b.post._id ?? "").localeCompare(String(a.post._id ?? ""))
    )
    .map((x) => x.post);
}

/**
 * MongoDB stages that compute the same score and sort by it.
 * Ties break on TimeOfPost then _id so ordering is deterministic across pages.
 * Callers append their own $skip/$limit.
 */
export function buildRankingStages(
  mode: FeedMode,
  opts: { now?: number; followedIds?: readonly string[] } = {}
): Record<string, unknown>[] {
  const { gravity, followBoost, freshnessBoost } = MODE_CONFIG[mode];
  const w = ENGAGEMENT_WEIGHTS;
  const nowDate = new Date(bucketNow(opts.now));
  const num = (field: string) => ({ $max: [0, { $convert: { input: `$${field}`, to: "double", onError: 0, onNull: 0 } }] });

  const engagement = {
    $add: [
      1,
      { $multiply: [num("NoOfLikes"), w.like] },
      { $multiply: [num("NoOfComment"), w.comment] },
      { $multiply: [num("NoOfShares"), w.share] },
      { $multiply: [num("NoOfBookmarks"), w.bookmark] },
    ],
  };

  // Hours since posting; unparseable or missing dates count as UNKNOWN_DATE_AGE_HOURS old.
  const unknownDate = new Date(nowDate.getTime() - UNKNOWN_DATE_AGE_HOURS * 3_600_000);
  const ageHoursExpr = {
    $max: [
      0,
      {
        $divide: [
          { $subtract: [nowDate, { $dateFromString: { dateString: "$TimeOfPost", onError: unknownDate, onNull: unknownDate } }] },
          3_600_000,
        ],
      },
    ],
  };

  const boost =
    followBoost !== 1 && opts.followedIds?.length
      ? { $cond: [{ $in: ["$UserId", opts.followedIds] }, followBoost, 1] }
      : 1;

  const ageStage = { $addFields: { _feedAge: ageHoursExpr } };
  const usesAge = gravity !== 0 || freshnessBoost !== 0;

  // 1 + freshnessBoost * max(0, 1 - age / window)
  const freshness =
    freshnessBoost === 0
      ? 1
      : {
          $add: [
            1,
            { $multiply: [freshnessBoost, { $max: [0, { $subtract: [1, { $divide: ["$_feedAge", FRESHNESS_WINDOW_HOURS] }] }] }] },
          ],
        };

  const numerator = { $multiply: [engagement, boost, freshness] };
  const score =
    gravity === 0
      ? numerator
      : { $divide: [numerator, { $pow: [{ $add: ["$_feedAge", AGE_OFFSET_HOURS] }, gravity] }] };

  return [
    ...(usesAge ? [ageStage] : []),
    { $addFields: { _feedScore: score } },
    { $sort: { _feedScore: -1, TimeOfPost: -1, _id: -1 } },
    { $project: usesAge ? { _feedScore: 0, _feedAge: 0 } : { _feedScore: 0 } },
  ];
}
