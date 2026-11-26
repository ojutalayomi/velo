import {
  FRESHNESS_WINDOW_HOURS,
  SCORE_TIME_BUCKET_MS,
  bucketNow,
  buildRankingStages,
  freshnessFactor,
  rankPosts,
  scorePost,
  weightedEngagement,
} from "@/lib/feedRanking";

const NOW = Date.parse("2026-06-10T12:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

describe("weightedEngagement", () => {
  it("weights shares and comments above likes and ignores junk counts", () => {
    expect(weightedEngagement({ NoOfLikes: 1, NoOfComment: 1, NoOfShares: 1, NoOfBookmarks: 1 })).toBe(8);
    expect(weightedEngagement({ NoOfLikes: -5, NoOfComment: null, NoOfShares: NaN })).toBe(0);
  });
});

describe("scorePost", () => {
  it("decays with age", () => {
    const fresh = scorePost({ TimeOfPost: hoursAgo(1), NoOfLikes: 10 }, { mode: "forYou", now: NOW });
    const old = scorePost({ TimeOfPost: hoursAgo(48), NoOfLikes: 10 }, { mode: "forYou", now: NOW });
    expect(fresh).toBeGreaterThan(old);
  });

  it("lets a much more engaged post beat a slightly newer one", () => {
    const ranked = rankPosts(
      [
        { id: "new-quiet", TimeOfPost: hoursAgo(1), NoOfLikes: 0 },
        { id: "older-loved", TimeOfPost: hoursAgo(3), NoOfLikes: 40, NoOfShares: 10 },
      ],
      { mode: "forYou", now: NOW }
    );
    expect(ranked[0].id).toBe("older-loved");
  });

  it("boosts followed authors only in forYou", () => {
    const post = { UserId: "a", TimeOfPost: hoursAgo(5), NoOfLikes: 3 };
    const followedIds = new Set(["a"]);
    const boosted = scorePost(post, { mode: "forYou", now: NOW, followedIds });
    const plain = scorePost(post, { mode: "forYou", now: NOW });
    expect(boosted / plain).toBeCloseTo(1.6);
    expect(scorePost(post, { mode: "hot", now: NOW, followedIds })).toBe(
      scorePost(post, { mode: "hot", now: NOW })
    );
  });

  it("popular ignores age entirely", () => {
    const a = scorePost({ TimeOfPost: hoursAgo(1), NoOfLikes: 5 }, { mode: "popular", now: NOW });
    const b = scorePost({ TimeOfPost: hoursAgo(5000), NoOfLikes: 5 }, { mode: "popular", now: NOW });
    expect(a).toBe(b);
  });

  it("treats missing/invalid timestamps as old: no freshness bonus, finite score", () => {
    const bad = scorePost({ TimeOfPost: "nope", NoOfLikes: 1 }, { mode: "forYou", now: NOW });
    const missing = scorePost({ NoOfLikes: 1 }, { mode: "forYou", now: NOW });
    const year = scorePost({ TimeOfPost: hoursAgo(24 * 365), NoOfLikes: 1 }, { mode: "forYou", now: NOW });
    expect(bad).toBe(year);
    expect(missing).toBe(year);
    expect(Number.isFinite(bad)).toBe(true);
  });

  it("clamps future timestamps to age 0", () => {
    const future = scorePost({ TimeOfPost: hoursAgo(-10), NoOfLikes: 1 }, { mode: "forYou", now: NOW });
    const justNow = scorePost({ TimeOfPost: hoursAgo(0), NoOfLikes: 1 }, { mode: "forYou", now: NOW });
    expect(future).toBe(justNow);
  });

  it("ties break newest first", () => {
    const ranked = rankPosts(
      [
        { id: "older", TimeOfPost: hoursAgo(30), NoOfLikes: 4 },
        { id: "newer", TimeOfPost: hoursAgo(3), NoOfLikes: 4 },
      ],
      { mode: "popular", now: NOW }
    );
    expect(ranked.map((p) => p.id)).toEqual(["newer", "older"]);
  });
});

describe("freshness bonus", () => {
  it("fades linearly from full bonus to none over the window", () => {
    expect(freshnessFactor(0, 2)).toBe(3);
    expect(freshnessFactor(FRESHNESS_WINDOW_HOURS / 2, 2)).toBe(2);
    expect(freshnessFactor(FRESHNESS_WINDOW_HOURS, 2)).toBe(1);
    expect(freshnessFactor(FRESHNESS_WINDOW_HOURS * 10, 2)).toBe(1);
    expect(freshnessFactor(0, 0)).toBe(1);
  });

  it("lets a new quiet post beat a much older viral one in For you", () => {
    const ranked = rankPosts(
      [
        { id: "old-viral", TimeOfPost: hoursAgo(240), NoOfLikes: 900, NoOfComment: 300, NoOfShares: 200, NoOfBookmarks: 150 },
        { id: "new-quiet", TimeOfPost: hoursAgo(0.2) },
      ],
      { mode: "forYou", now: NOW }
    );
    expect(ranked[0].id).toBe("new-quiet");
  });

  it("does not apply to hot or popular", () => {
    const post = { TimeOfPost: hoursAgo(0.1), NoOfLikes: 5 };
    const noBonus = (mode: "hot" | "popular") => scorePost(post, { mode, now: NOW });
    expect(noBonus("popular")).toBe(6);
    expect(noBonus("hot")).toBeCloseTo(6 / Math.pow(0.1 + 2, 1.8));
  });
});

describe("rankPosts tie-breaking", () => {
  it("breaks identical score and time by _id descending, like the Mongo sort", () => {
    const t = hoursAgo(5);
    const ranked = rankPosts(
      [
        { id: "low", _id: "aaa", TimeOfPost: t, NoOfLikes: 2 },
        { id: "high", _id: "bbb", TimeOfPost: t, NoOfLikes: 2 },
      ],
      { mode: "forYou", now: NOW }
    );
    expect(ranked.map((p) => p.id)).toEqual(["high", "low"]);
  });
});

describe("bucketNow", () => {
  it("is stable within a bucket so paging does not reshuffle", () => {
    const base = Math.floor(NOW / SCORE_TIME_BUCKET_MS) * SCORE_TIME_BUCKET_MS;
    expect(bucketNow(base + 1)).toBe(base);
    expect(bucketNow(base + SCORE_TIME_BUCKET_MS - 1)).toBe(base);
    expect(bucketNow(base + SCORE_TIME_BUCKET_MS)).toBe(base + SCORE_TIME_BUCKET_MS);
  });
});

describe("buildRankingStages", () => {
  it("scores, sorts deterministically, then strips the helper field", () => {
    const stages = buildRankingStages("forYou", { now: NOW, followedIds: ["a"] });
    expect(stages.map((s) => Object.keys(s)[0])).toEqual(["$addFields", "$addFields", "$sort", "$project"]);
    expect(stages[2]).toEqual({ $sort: { _feedScore: -1, TimeOfPost: -1, _id: -1 } });
    expect(stages[3]).toEqual({ $project: { _feedScore: 0, _feedAge: 0 } });
  });

  it("only adds the follow boost when there are followed ids to match", () => {
    const withIds = JSON.stringify(buildRankingStages("forYou", { followedIds: ["a"] }));
    const without = JSON.stringify(buildRankingStages("forYou"));
    expect(withIds).toContain('"$in":["$UserId",["a"]]');
    expect(without).not.toContain("$UserId");
    expect(JSON.stringify(buildRankingStages("hot", { followedIds: ["a"] }))).not.toContain("$UserId");
  });

  it("omits time decay and the age stage for popular", () => {
    expect(JSON.stringify(buildRankingStages("popular"))).not.toContain("$pow");
    expect(JSON.stringify(buildRankingStages("popular"))).not.toContain("_feedAge");
    expect(JSON.stringify(buildRankingStages("hot"))).toContain("$pow");
  });
});
