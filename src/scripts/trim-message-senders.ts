/**
 * Trims the `sender` of every stored chat message down to `{ id }`.
 *
 * Messages used to carry a copy of the sender's name, username, picture and verified badge.
 * Those are now read from the user's account when a message is shown, so the copies only waste
 * space and can go stale. The id stays, so every query on `sender.id` keeps working.
 *
 * A message from someone whose account no longer exists is left alone: its copy is the only
 * record of who they were.
 *
 * Deploy the web app and the socket server first (both must read senders from accounts), then:
 *
 *   npx tsx --env-file=.env.local src/scripts/trim-message-senders.ts          # dry run, changes nothing
 *   npx tsx --env-file=.env.local src/scripts/trim-message-senders.ts --apply  # does it
 *
 * Safe to run again: it only touches messages that still carry the extra fields.
 */

import { ObjectId } from "mongodb";

import { MongoDBClient } from "../lib/mongodb";

const EXTRA_FIELDS = ["name", "username", "displayPicture", "verified"] as const;

async function trimMessageSenders() {
  const apply = process.argv.includes("--apply");
  const db = await new MongoDBClient().init();
  const messages = db.chatMessages();

  const carriesCopy = {
    $or: EXTRA_FIELDS.map((field) => ({ [`sender.${field}`]: { $exists: true } })),
  };

  const [total, withCopy] = await Promise.all([
    messages.countDocuments({}),
    messages.countDocuments(carriesCopy),
  ]);
  console.log(`${total} messages, ${withCopy} still carry a copy of the sender's profile.`);
  if (withCopy === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Only trim senders whose account still exists.
  const senderIds = ((await messages.distinct("sender.id", carriesCopy)) as unknown[]).map(String);
  const valid = senderIds.filter((id) => ObjectId.isValid(id));
  const existing = new Set(
    (
      await db
        .users()
        .find({ _id: { $in: valid.map((id) => new ObjectId(id)) } }, { projection: { _id: 1 } })
        .toArray()
    ).map((user) => String(user._id))
  );
  const missing = senderIds.filter((id) => !existing.has(id));

  const filter = { ...carriesCopy, "sender.id": { $in: [...existing] } };
  const toTrim = await messages.countDocuments(filter);
  console.log(
    `${existing.size} senders have an account; ${missing.length} do not (their messages are kept as they are).`
  );
  console.log(`${toTrim} messages would be trimmed.`);

  if (!apply) {
    console.log("\nDry run: nothing changed. Run again with --apply to trim them.");
    return;
  }

  const result = await messages.updateMany(filter, {
    $unset: Object.fromEntries(EXTRA_FIELDS.map((field) => [`sender.${field}`, ""])),
  });
  console.log(`\nTrimmed ${result.modifiedCount} messages.`);
  const remaining = await messages.countDocuments(carriesCopy);
  console.log(`${remaining} messages still carry a copy (those whose sender has no account).`);
}

trimMessageSenders()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Trim failed:", error);
    process.exit(1);
  });
