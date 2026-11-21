import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { isChatMember } from "@/lib/chatMembership";
import { MongoDBClient } from "@/lib/mongodb";
import {
  isPollClosed,
  parsePollContent,
  PollData,
  PollResults,
  PollTargetType,
  validateVote,
} from "@/lib/polls";
import { getAuthenticatedUserId } from "@/lib/statusServer";

type Params = { params: Promise<{ targetType: string; targetId: string }> };

let indexReady = false;

/** Loads the poll definition, checking that `userId` is allowed to see it. */
async function loadPoll(
  db: MongoDBClient,
  targetType: PollTargetType,
  targetId: string,
  userId: string
): Promise<PollData | null> {
  if (targetType === "post") {
    const post = await db.posts().findOne({ PostID: targetId }, { projection: { Poll: 1 } });
    return post?.Poll ?? null;
  }
  if (!ObjectId.isValid(targetId)) return null;
  const message = await db
    .chatMessages()
    .findOne({ _id: new ObjectId(targetId) }, { projection: { content: 1, chatId: 1, messageType: 1 } });
  if (!message || message.messageType !== "Poll") return null;
  if (!(await isChatMember(db, String(message.chatId), userId))) return null;
  return parsePollContent(message.content);
}

async function buildResults(
  db: MongoDBClient,
  poll: PollData,
  targetType: PollTargetType,
  targetId: string,
  userId: string
): Promise<PollResults> {
  const votes = await db.pollVotes().find({ targetType, targetId }).toArray();
  const counts = poll.options.map(() => 0);
  let myVotes: number[] = [];
  for (const vote of votes) {
    for (const index of vote.options) if (index in counts) counts[index] += 1;
    if (vote.userId === userId) myVotes = vote.options;
  }
  return { counts, total: counts.reduce((a, b) => a + b, 0), voters: votes.length, myVotes };
}

function parseTarget(targetType: string): PollTargetType | null {
  return targetType === "post" || targetType === "message" ? targetType : null;
}

export async function GET(_: Request, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { targetType: rawType, targetId } = await params;
    const targetType = parseTarget(rawType);
    if (!targetType) return NextResponse.json({ message: "Invalid target" }, { status: 400 });

    const db = await new MongoDBClient().init();
    const poll = await loadPoll(db, targetType, targetId, userId);
    if (!poll) return NextResponse.json({ message: "Poll not found" }, { status: 404 });

    return NextResponse.json({
      data: { poll, results: await buildResults(db, poll, targetType, targetId, userId), closed: isPollClosed(poll) },
    });
  } catch (error) {
    console.error("[api/polls] GET failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

/** Body: `{ options: number[] }`. Replaces the caller's previous vote; an empty array retracts it. */
export async function POST(request: Request, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { targetType: rawType, targetId } = await params;
    const targetType = parseTarget(rawType);
    if (!targetType) return NextResponse.json({ message: "Invalid target" }, { status: 400 });

    const body = (await request.json().catch(() => ({}))) as { options?: unknown };

    const db = await new MongoDBClient().init();
    const poll = await loadPoll(db, targetType, targetId, userId);
    if (!poll) return NextResponse.json({ message: "Poll not found" }, { status: 404 });
    if (isPollClosed(poll)) return NextResponse.json({ message: "Poll is closed" }, { status: 409 });

    if (!indexReady) {
      await db
        .pollVotes()
        .createIndex({ targetType: 1, targetId: 1, userId: 1 }, { unique: true });
      indexReady = true;
    }

    if (Array.isArray(body.options) && body.options.length === 0) {
      await db.pollVotes().deleteOne({ targetType, targetId, userId });
    } else {
      const options = validateVote(poll, body.options);
      if (!options) return NextResponse.json({ message: "Invalid vote" }, { status: 400 });
      await db.pollVotes().updateOne(
        { targetType, targetId, userId },
        {
          $set: { options, votedAt: new Date().toISOString() },
          $setOnInsert: { _id: new ObjectId() },
        },
        { upsert: true }
      );
    }

    return NextResponse.json({
      data: { poll, results: await buildResults(db, poll, targetType, targetId, userId), closed: false },
    });
  } catch (error) {
    console.error("[api/polls] POST failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
