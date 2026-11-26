/**
 * One-time / maintenance: normalize Posts fields required by trends, ensure the
 * trends index, then print the current trending snapshot.
 *
 * Trends only count Posts with:
 *   Visibility: "everyone", Type: "post", string UserId, ISO TimeOfPost in last 24h
 *   Caption hashtags shared by ≥3 distinct authors
 *
 *   npm run backfill:trends
 *   npm run backfill:trends -- --seed   # also create demo hashtag posts if needed
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { type Filter, ObjectId } from "mongodb";

import { extractHashtags, TREND_MIN_AUTHORS, TREND_WINDOW_HOURS } from "../lib/trends";
import type { PostAuthorFields } from "../lib/postAuthor";
import type { PostSchema } from "../lib/types/type";

const ISO_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

const SEED_TAGS = ["velo", "music", "tech"] as const;
const SEED_PREFIX = "trend-seed-";

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) continue;
    try {
      loadEnvFile(path);
    } catch {
      // Rely on --env-file CLI flag on older Node.
    }
  }
}

function toIsoTime(value: unknown): string | null {
  if (typeof value === "string") {
    if (ISO_TIME.test(value)) return null;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return null;
}

function asUserIdString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed === value ? null : trimmed;
  }
  if (value instanceof ObjectId) return value.toString();
  if (value && typeof value === "object" && "$oid" in (value as object)) {
    return String((value as { $oid: string }).$oid);
  }
  return null;
}

type Patch = Partial<Pick<PostSchema, "Type" | "Visibility" | "TimeOfPost" | "UserId">>;

function buildPatch(post: PostSchema): Patch | null {
  const patch: Patch = {};

  if (post.Type == null || post.Type === ("" as PostSchema["Type"])) {
    patch.Type = "post";
  }
  if (post.Visibility == null || post.Visibility === ("" as PostSchema["Visibility"])) {
    patch.Visibility = "everyone";
  }

  const iso = toIsoTime(post.TimeOfPost);
  if (iso) patch.TimeOfPost = iso;

  const userId = asUserIdString(post.UserId as unknown);
  if (userId) patch.UserId = userId;

  return Object.keys(patch).length ? patch : null;
}

async function seedDemoTrends(db: InstanceType<typeof import("../lib/mongodb").MongoDBClient>) {
  const users = await db
    .users()
    .find({}, { projection: { _id: 1 } })
    .limit(TREND_MIN_AUTHORS)
    .toArray();

  if (users.length < TREND_MIN_AUTHORS) {
    console.log(
      `  Seed skipped: need ≥${TREND_MIN_AUTHORS} users, found ${users.length}`
    );
    return 0;
  }

  const posts = db.posts();
  let created = 0;
  const now = Date.now();

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const userId = user._id.toString();
    const tags = SEED_TAGS.map((t) => `#${t}`).join(" ");
    const postId = `${SEED_PREFIX}${userId}-${i}`;
    const existing = await posts.findOne({ PostID: postId });
    if (existing) continue;

    // Posts store only who wrote them (UserId); the author's profile is read from the account, so
    // the copied author fields are not written (see src/lib/postAuthor.ts).
    const doc: Omit<PostSchema, keyof PostAuthorFields> = {
      _id: new ObjectId().toString(),
      UserId: userId,
      TimeOfPost: new Date(now - i * 60_000).toISOString(),
      Visibility: "everyone",
      Caption: `Trending backfill seed ${tags}`,
      Image: [],
      IsFollowing: false,
      NoOfLikes: 0,
      Liked: false,
      NoOfComment: 0,
      NoOfShares: 0,
      NoOfBookmarks: 0,
      Bookmarked: false,
      PostID: postId,
      Code: "",
      WhoCanComment: "everyone",
      Shared: false,
      Type: "post",
      ParentId: "",
    };
    // PostSchema still types the author fields as required, so the collection needs the cast.
    await posts.insertOne(doc as unknown as PostSchema);
    created++;
  }

  console.log(`  Seed created=${created} posts with tags: ${SEED_TAGS.map((t) => `#${t}`).join(" ")}`);
  return created;
}

async function main() {
  loadEnv();
  if (!process.env.MONGOLINK) {
    throw new Error("MONGOLINK is missing. Run: npm run backfill:trends");
  }

  const seed = process.argv.includes("--seed");
  const { MongoDBClient } = await import("../lib/mongodb");
  const { ensureTrendIndexes, loadTrendsSnapshot } = await import("../lib/trendsServer");

  const wrapper = await new MongoDBClient().init();
  const mongo = await wrapper.getDb();
  const posts = wrapper.posts();

  console.log("Ensuring trends index...");
  await ensureTrendIndexes(mongo);

  console.log("Backfilling Posts fields for trends eligibility...");
  let updated = 0;
  let scanned = 0;

  // Matches documents that are missing (or have empty/invalid) trend fields, which the strict
  // PostSchema typing cannot express (null, "", $not/$type), so it is built as a plain filter.
  const needsBackfill: Filter<Record<string, unknown>> = {
    $or: [
      { Type: { $exists: false } },
      { Type: null },
      { Type: "" },
      { Visibility: { $exists: false } },
      { Visibility: null },
      { Visibility: "" },
      { UserId: { $not: { $type: "string" } } },
      { TimeOfPost: { $not: { $type: "string" } } },
      {
        $and: [{ TimeOfPost: { $type: "string" } }, { TimeOfPost: { $not: ISO_TIME } }],
      },
    ],
  };
  const cursor = posts.find(needsBackfill as unknown as Filter<PostSchema>);

  for await (const post of cursor) {
    scanned++;
    const patch = buildPatch(post as PostSchema);
    if (!patch) continue;
    // Stored _ids are ObjectIds even though PostSchema types _id as string.
    const rawId: unknown = post._id;
    const _id = rawId instanceof ObjectId ? rawId : new ObjectId(String(rawId));
    await posts.updateOne({ _id } as unknown as Filter<PostSchema>, { $set: patch });
    updated++;
  }

  console.log(`Backfill complete: scanned=${scanned}, updated=${updated}`);

  if (seed) {
    console.log("Seeding demo trending posts...");
    await seedDemoTrends(wrapper);
  }

  const windowStart = new Date(Date.now() - TREND_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();
  const eligible = await posts.countDocuments({
    Visibility: "everyone",
    Type: "post",
    UserId: { $type: "string" },
    TimeOfPost: { $gte: windowStart, $lte: nowIso },
  });

  const withHashtags = await posts
    .find({
      Visibility: "everyone",
      Type: "post",
      UserId: { $type: "string" },
      TimeOfPost: { $gte: windowStart, $lte: nowIso },
      Caption: { $regex: "#[A-Za-z0-9_]+" },
    })
    .project({ Caption: 1, UserId: 1 })
    .limit(200)
    .toArray();

  const tagAuthors = new Map<string, Set<string>>();
  for (const post of withHashtags) {
    for (const tag of extractHashtags(post.Caption)) {
      if (!tagAuthors.has(tag)) tagAuthors.set(tag, new Set());
      tagAuthors.get(tag)!.add(String(post.UserId).trim());
    }
  }

  console.log(`\nDiagnostics (last ${TREND_WINDOW_HOURS}h):`);
  console.log(`  eligible posts: ${eligible}`);
  console.log(`  sampled hashtag posts: ${withHashtags.length}`);
  const nearMiss = [...tagAuthors.entries()]
    .map(([tag, authors]) => ({ tag, authors: authors.size }))
    .sort((a, b) => b.authors - a.authors)
    .slice(0, 10);
  for (const row of nearMiss) {
    console.log(
      `  #${row.tag}: ${row.authors} author(s)${row.authors < TREND_MIN_AUTHORS ? ` (need ${TREND_MIN_AUTHORS})` : ""}`
    );
  }

  console.log("\nLoading trends snapshot...");
  const snapshot = await loadTrendsSnapshot();
  if (!snapshot.data.length) {
    console.log("  (empty) — post the same hashtag from ≥3 accounts within 24h, or re-run with --seed");
  } else {
    for (const trend of snapshot.data) {
      console.log(
        `  #${trend.tag}: ${trend.postCount} posts · ${trend.authorCount} people`
      );
    }
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
