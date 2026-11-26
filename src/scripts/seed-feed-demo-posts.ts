/**
 * Seed a handful of fresh, differently-engaged posts so the ranked feeds have something to
 * order (hot/popular otherwise look identical on stale data).
 *
 * LOCAL ONLY: refuses to run unless MONGOLINK points at localhost/127.0.0.1.
 * Seeded posts carry `_seed: "feed-demo"`, so re-running replaces them and `--clean` removes them.
 *
 * Run with:
 *   MONGOLINK=mongodb://127.0.0.1:27018 MONGODB_DATABASE=mydb npm run seed:feed-demo
 *   ... npm run seed:feed-demo -- --viewer <userId>   # make the "followed" posts come from someone this user follows
 *   ... npm run seed:feed-demo -- --clean
 */

import { ObjectId } from "mongodb";

import { MongoDBClient } from "../lib/mongodb";

const SEED_TAG = "feed-demo";
const HOUR = 3_600_000;

interface Scenario {
  label: string;
  ageHours: number;
  followed: boolean;
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
}

// Ages are relative to "now", so the scenario is meaningful whenever you run it.
const SCENARIOS: Scenario[] = [
  { label: "brand new, followed, no engagement", ageHours: 0.2, followed: true, likes: 0, comments: 0, shares: 0, bookmarks: 0 },
  { label: "brand new, stranger, no engagement", ageHours: 0.2, followed: false, likes: 0, comments: 0, shares: 0, bookmarks: 0 },
  { label: "1h old, stranger, going viral", ageHours: 1, followed: false, likes: 40, comments: 12, shares: 9, bookmarks: 6 },
  { label: "2h old, followed, a little engagement", ageHours: 2, followed: true, likes: 3, comments: 1, shares: 0, bookmarks: 0 },
  { label: "6h old, stranger, moderate", ageHours: 6, followed: false, likes: 15, comments: 4, shares: 2, bookmarks: 1 },
  { label: "20h old, stranger, popular", ageHours: 20, followed: false, likes: 60, comments: 20, shares: 15, bookmarks: 10 },
  { label: "3 days old, followed, very popular", ageHours: 72, followed: true, likes: 120, comments: 40, shares: 30, bookmarks: 25 },
  { label: "10 days old, stranger, mega viral", ageHours: 240, followed: false, likes: 900, comments: 300, shares: 200, bookmarks: 150 },
];

function assertLocal() {
  const uri = process.env.MONGOLINK ?? "";
  let host = "";
  try {
    host = new URL(uri).hostname;
  } catch {
    // fall through to the refusal below
  }
  if (host !== "127.0.0.1" && host !== "localhost") {
    console.error("Refusing to run: MONGOLINK must point at localhost/127.0.0.1 (this script writes data).");
    process.exit(1);
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  assertLocal();
  const db = await new MongoDBClient().init();
  const posts = db.posts();

  const removed = await posts.deleteMany({ _seed: SEED_TAG } as never);
  if (process.argv.includes("--clean")) {
    console.log(`Removed ${removed.deletedCount} seeded posts.`);
    process.exit(0);
  }

  const viewer = arg("--viewer");
  const followedIds = viewer
    ? (await db.followers().find({ followerId: viewer }).toArray()).map((f) => f.followedId)
    : [];
  const users = await db.users().find({}, { projection: { _id: 1 } }).toArray();
  const userIds = users.map((u) => u._id.toString());
  const followedPool = followedIds.filter((id) => userIds.includes(id));
  const strangerPool = userIds.filter((id) => id !== viewer && !followedPool.includes(id));
  if (!strangerPool.length || (viewer && !followedPool.length)) {
    console.error("Not enough users/follows in this database to build the scenarios.");
    process.exit(1);
  }

  const now = Date.now();
  const docs = SCENARIOS.map((s, i) => {
    const pool = s.followed && followedPool.length ? followedPool : strangerPool;
    const _id = new ObjectId();
    return {
      _id,
      PostID: _id.toHexString(),
      _seed: SEED_TAG,
      ParentId: "",
      UserId: pool[i % pool.length],
      TimeOfPost: new Date(now - s.ageHours * HOUR).toISOString(),
      Visibility: "everyone",
      Caption: `[seed] ${s.label}`,
      // Explore only lists posts with media; this URL is a placeholder and will not load.
      Image: ["https://example.com/seed-photo.jpg"],
      NoOfLikes: s.likes,
      NoOfComment: s.comments,
      NoOfShares: s.shares,
      NoOfBookmarks: s.bookmarks,
      Liked: false,
      Bookmarked: false,
      Shared: false,
      Code: "",
      WhoCanComment: "everyone",
      Type: "post",
      IsFollowing: false,
    };
  });

  await posts.insertMany(docs as never);
  console.log(`Replaced ${removed.deletedCount} old seeds; inserted ${docs.length}:`);
  for (const d of docs) console.log(`  ${d.PostID}  ${d.Caption}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
