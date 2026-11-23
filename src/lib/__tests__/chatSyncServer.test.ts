/**
 * @jest-environment node
 */
import { ObjectId } from "mongodb";

import { changedSinceFilter } from "@/lib/chatSync";
import { buildMessageFilter } from "@/lib/chatSyncServer";
import type { MongoDBClient } from "@/lib/mongodb";

const since = "2026-06-10T11:00:00.000Z";
const chatIds = ["c1", "c2"];
const visible = { $or: [{ chatId: { $in: chatIds } }, { senderId: "u1" }, { receiverId: "u1" }] };

function fakeDb(receipts: Array<{ messageId: string }> = []) {
  const toArray = jest.fn(async () => receipts);
  const find = jest.fn(() => ({ toArray }));
  const readReceipts = jest.fn(() => ({ find }));
  return { db: { readReceipts } as unknown as MongoDBClient, readReceipts, find };
}

describe("buildMessageFilter", () => {
  it("returns the visibility filter untouched for a full load, without touching receipts", async () => {
    const { db, readReceipts } = fakeDb();

    expect(await buildMessageFilter(db, visible, chatIds, null)).toBe(visible);
    expect(readReceipts).not.toHaveBeenCalled();
  });

  it("narrows to visible messages changed since the cursor", async () => {
    const { db } = fakeDb();

    expect(await buildMessageFilter(db, visible, chatIds, since)).toEqual({
      $and: [visible, changedSinceFilter(since)],
    });
  });

  it("looks up receipts read since the cursor, in the user's chats only", async () => {
    const { db, find } = fakeDb();

    await buildMessageFilter(db, visible, chatIds, since);

    expect(find).toHaveBeenCalledWith(
      { chatId: { $in: chatIds }, readAt: { $gt: since } },
      { projection: { messageId: 1 } }
    );
  });

  it("includes messages read since, de-duplicated and as ObjectIds", async () => {
    const a = new ObjectId();
    const b = new ObjectId();
    const { db } = fakeDb([
      { messageId: a.toString() },
      { messageId: a.toString() },
      { messageId: b.toString() },
    ]);

    const filter = (await buildMessageFilter(db, visible, chatIds, since)) as {
      $and: [unknown, { $or: unknown[] }];
    };

    expect(filter.$and[1].$or).toContainEqual({ _id: { $in: [a, b] } });
  });

  it("ignores receipts that don't point at a real message id", async () => {
    const { db } = fakeDb([{ messageId: "not-an-object-id" }]);

    const filter = (await buildMessageFilter(db, visible, chatIds, since)) as {
      $and: [unknown, { $or: Array<Record<string, unknown>> }];
    };

    expect(filter.$and[1].$or.some((clause) => "_id" in clause)).toBe(false);
  });

  it("adds no _id clause when nothing was read since", async () => {
    const { db } = fakeDb([]);

    expect(await buildMessageFilter(db, visible, chatIds, since)).toEqual({
      $and: [visible, changedSinceFilter(since, [])],
    });
  });
});
