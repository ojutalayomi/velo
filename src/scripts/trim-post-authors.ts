/**
 * Slims what posts, comments and shares store.
 *
 * 1. Reposts (Posts_Shares, Type "repost") are only a reference to the original post. Older ones
 *    copied the whole post (caption, images, counters...), which duplicated it in search and
 *    explore and went stale. They are cut down to what a repost is: who reposted, when, and which
 *    post (_id, UserId, Type, PostID, OriginalPostId, TimeOfPost, plus any admin "hidden" marks).
 *    A repost with no OriginalPostId cannot be rebuilt, so it is left alone.
 * 2. Every post, comment and share loses its copy of the author's profile.
 *
 * Posts used to carry NameOfPoster, Username, DisplayPicture and Verified. Those are now read
 * from the author's account whenever a post is shown, so the copies only waste space and go
 * stale after a rename or a new photo. UserId stays, so every query on it keeps working.
 *
 * A post from someone whose account no longer exists is left alone: its copy is the only
 * record of who they were.
 *
 * Deploy the web app and the socket server first (both must read authors from accounts), then:
 *
 *   npx tsx --env-file=.env.local src/scripts/trim-post-authors.ts          # dry run, changes nothing
 *   npx tsx --env-file=.env.local src/scripts/trim-post-authors.ts --apply  # does it
 *
 * Safe to run again: it only touches documents that still carry the extra fields.
 */

import { type Document, ObjectId } from "mongodb";

import { MongoDBClient } from "../lib/mongodb";
import { AUTHOR_FIELDS } from "../lib/postAuthor";

async function trimPostAuthors() {
  const apply = process.argv.includes("--apply");
  const db = await new MongoDBClient().init();
  const collections = [
    ["Posts", db.posts()],
    ["Posts_Comments", db.postsComments()],
    ["Posts_Shares", db.postsShares()],
  ] as const;

  // What a repost keeps. The author fields stay until step 2, which keeps them for deleted accounts.
  const REPOST_KEEP = [
    "_id",
    "UserId",
    "Type",
    "PostID",
    "OriginalPostId",
    "TimeOfPost",
    "hidden",
    "hiddenBy",
    "hiddenAt",
    ...AUTHOR_FIELDS,
  ];
  const shares = db.postsShares();
  const fatRepost: Document = {
    Type: "repost",
    OriginalPostId: { $type: "string", $ne: "" },
    $expr: {
      $gt: [
        {
          $size: {
            $filter: {
              input: { $objectToArray: "$$ROOT" },
              cond: { $not: [{ $in: ["$$this.k", REPOST_KEEP] }] },
            },
          },
        },
        0,
      ],
    },
  };
  const [reposts, fat, noTarget] = await Promise.all([
    shares.countDocuments({ Type: "repost" }),
    shares.countDocuments(fatRepost),
    shares.countDocuments({ Type: "repost", OriginalPostId: { $not: { $type: "string" } } }),
  ]);
  console.log(
    `Reposts: ${reposts} in Posts_Shares, ${fat} still carry a copy of the post, ${noTarget} have no OriginalPostId (left alone).`
  );

  const carriesCopy = { $or: AUTHOR_FIELDS.map((field) => ({ [field]: { $exists: true } })) };

  // Which authors still have an account (checked once, across all three collections).
  const authorIds = new Set<string>();
  for (const [, collection] of collections) {
    for (const id of (await collection.distinct("UserId", carriesCopy)) as unknown[]) authorIds.add(String(id));
  }
  const valid = [...authorIds].filter((id) => ObjectId.isValid(id));
  const existing = new Set(
    (
      await db
        .users()
        .find({ _id: { $in: valid.map((id) => new ObjectId(id)) } }, { projection: { _id: 1 } })
        .toArray()
    ).map((user) => String(user._id))
  );
  const missing = [...authorIds].filter((id) => !existing.has(id));
  console.log(
    `${existing.size} authors have an account; ${missing.length} do not (their posts are kept as they are).`
  );

  const filter = { ...carriesCopy, UserId: { $in: [...existing] } };
  let total = 0;
  for (const [name, collection] of collections) {
    const [all, withCopy, toTrim] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments(carriesCopy),
      collection.countDocuments(filter),
    ]);
    total += toTrim;
    console.log(`${name}: ${all} documents, ${withCopy} carry a copy, ${toTrim} would be trimmed.`);
  }

  if (!apply) {
    console.log(`\nDry run: nothing changed (${total} documents would be trimmed). Run again with --apply.`);
    return;
  }

  const slimmed = await shares.updateMany(fatRepost, [
    {
      $replaceWith: {
        $arrayToObject: {
          $filter: {
            input: { $objectToArray: "$$ROOT" },
            cond: { $in: ["$$this.k", REPOST_KEEP] },
          },
        },
      },
    },
  ]);
  console.log(`Reposts: slimmed ${slimmed.modifiedCount}.`);

  for (const [name, collection] of collections) {
    const result = await collection.updateMany(filter, {
      $unset: Object.fromEntries(AUTHOR_FIELDS.map((field) => [field, ""])),
    });
    const remaining = await collection.countDocuments(carriesCopy);
    console.log(`${name}: trimmed ${result.modifiedCount}; ${remaining} still carry a copy (author has no account).`);
  }
}

trimPostAuthors()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Trim failed:", error);
    process.exit(1);
  });
