/**
 * Post_Analytics health report, and optional removal of legacy (pre-v2) documents.
 *
 * Reports how much usable schemaVersion-2 data exists and whether it is enough to consider a
 * dwell-time ranking signal (see src/lib/postAnalytics.md: analytics is telemetry only until then).
 *
 *   npm run report:post-analytics
 *   npm run report:post-analytics -- --purge-legacy                 # dry run: only counts
 *   npm run report:post-analytics -- --purge-legacy --yes           # deletes legacy docs
 *
 * Legacy = any document whose schemaVersion is not 2. The purge is irreversible; against a
 * non-local database it also requires --i-have-a-backup (e.g. a fresh mongodump of the collection).
 * Point it at another database with MONGOLINK / MONGODB_DATABASE, which win over .env.local.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { MongoClient } from "mongodb";

const COLLECTION = "Post_Analytics";
const LEGACY_FILTER = { schemaVersion: { $ne: 2 } };

// A post's dwell is only trusted with at least this many qualified viewings from this many viewers.
const MIN_VIEWINGS_PER_POST = 20;
const MIN_DISTINCT_VIEWERS = 10;
// Posts that clear the bar, as a share of posts with any v2 viewing, before a signal is worthwhile.
const MIN_COVERAGE = 0.3;

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) continue;
    try {
      loadEnvFile(path);
    } catch {
      // Older Node without loadEnvFile: rely on --env-file.
    }
  }
}

const flag = (name: string) => process.argv.includes(name);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "n/a");

async function main() {
  loadEnv();
  const uri = process.env.MONGOLINK;
  const dbName = process.env.MONGODB_DATABASE;
  if (!uri || !dbName) throw new Error("MONGOLINK and MONGODB_DATABASE must be set.");

  const host = new URL(uri).hostname;
  const isLocal = host === "127.0.0.1" || host === "localhost";
  const client = await MongoClient.connect(uri);
  const col = client.db(dbName).collection(COLLECTION);
  console.log(`Target: ${host}/${dbName}.${COLLECTION} (${isLocal ? "local" : "REMOTE"})\n`);

  if (flag("--purge-legacy")) {
    const n = await col.countDocuments(LEGACY_FILTER);
    const keep = await col.countDocuments({ schemaVersion: 2 });
    console.log(`Legacy documents: ${n}   v2 documents kept: ${keep}`);
    if (!flag("--yes")) {
      console.log("Dry run: nothing deleted. Add --yes to delete.");
    } else if (!isLocal && !flag("--i-have-a-backup")) {
      console.error("Refusing: remote database. Take a mongodump first, then add --i-have-a-backup.");
      process.exitCode = 1;
    } else {
      const res = await col.deleteMany(LEGACY_FILTER);
      console.log(`Deleted ${res.deletedCount} legacy documents; ${await col.countDocuments()} remain.`);
    }
    await client.close();
    return;
  }

  const total = await col.countDocuments();
  console.log(`Total documents: ${total}`);
  console.log("\nBy version / event:");
  const groups = await col
    .aggregate([
      {
        $group: {
          _id: { v: { $ifNull: ["$schemaVersion", "legacy"] }, e: "$event" },
          n: { $sum: 1 },
          first: { $min: "$createdAt" },
          last: { $max: "$createdAt" },
        },
      },
      { $sort: { "_id.v": 1, n: -1 } },
    ])
    .toArray();
  for (const g of groups) {
    console.log(
      `  v=${String(g._id.v).padEnd(7)} ${String(g._id.e).padEnd(11)} ${String(g.n).padStart(6)}  ${String(g.first).slice(0, 10)} -> ${String(g.last).slice(0, 10)}`
    );
  }
  const legacy = await col.countDocuments(LEGACY_FILTER);
  console.log(`\nUsable v2 share: ${pct(total - legacy, total)} (${total - legacy} of ${total})`);

  // One engagement doc = one qualified viewing (a session on a post).
  const viewings = await col
    .find({ schemaVersion: 2, event: "engagement" }, { projection: { postId: 1, userId: 1, sessionId: 1, "metadata.activeMs": 1 } })
    .toArray();
  const byPost = new Map<string, { n: number; viewers: Set<string>; ms: number[] }>();
  for (const v of viewings) {
    const p = byPost.get(v.postId) ?? { n: 0, viewers: new Set<string>(), ms: [] };
    p.n += 1;
    p.viewers.add(v.userId ?? `anon:${v.sessionId}`);
    p.ms.push(v.metadata?.activeMs ?? 0);
    byPost.set(v.postId, p);
  }
  const viewers = new Set(viewings.map((v) => v.userId).filter(Boolean));
  console.log(`\nv2 qualified viewings: ${viewings.length} across ${byPost.size} posts, ${viewers.size} signed-in viewers`);

  const buckets: Record<string, number> = { "1": 0, "2": 0, "3-4": 0, "5-9": 0, "10-19": 0, [`${MIN_VIEWINGS_PER_POST}+`]: 0 };
  for (const p of byPost.values()) {
    const k = p.n >= MIN_VIEWINGS_PER_POST ? `${MIN_VIEWINGS_PER_POST}+` : p.n >= 10 ? "10-19" : p.n >= 5 ? "5-9" : p.n >= 3 ? "3-4" : String(p.n);
    buckets[k] += 1;
  }
  console.log("Posts by number of qualified viewings:", JSON.stringify(buckets));

  const allMs = viewings.map((v) => v.metadata?.activeMs ?? 0);
  console.log(
    `Dwell per viewing: median ${(median(allMs) / 1000).toFixed(1)}s, mean ${(allMs.reduce((a, b) => a + b, 0) / Math.max(1, allMs.length) / 1000).toFixed(1)}s, max ${(Math.max(0, ...allMs) / 1000).toFixed(0)}s (cap 1800s; a mean is skewed by idle tabs, prefer the median)`
  );

  const ready = [...byPost.values()].filter((p) => p.n >= MIN_VIEWINGS_PER_POST && p.viewers.size >= MIN_DISTINCT_VIEWERS).length;
  const coverage = byPost.size ? ready / byPost.size : 0;
  console.log(
    `\nPosts meeting the bar (>= ${MIN_VIEWINGS_PER_POST} viewings from >= ${MIN_DISTINCT_VIEWERS} viewers): ${ready} of ${byPost.size} (${pct(ready, byPost.size)})`
  );
  console.log(
    coverage >= MIN_COVERAGE
      ? `READY: >= ${MIN_COVERAGE * 100}% of viewed posts have enough data to consider a dwell signal.`
      : `NOT READY: need >= ${MIN_COVERAGE * 100}% of viewed posts to meet the bar. Keep collecting.`
  );
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
