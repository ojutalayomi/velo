/**
 * @jest-environment node
 */
import { ObjectId } from "mongodb";

import { findOrCreateDm } from "@/lib/dmServer";
import { dmKeyFor } from "@/lib/dmKey";
import type { MongoDBClient } from "@/lib/mongodb";

jest.mock("@/lib/chatMembership", () => ({
  ensureChatDmIndex: jest.fn().mockResolvedValue(undefined),
  isDuplicateKeyError: (e: { code?: number }) => e?.code === 11000,
}));

const a = new ObjectId().toString();
const b = new ObjectId().toString();

function makeDb(over: { byKey?: unknown; mine?: unknown[]; shared?: unknown[]; dm?: unknown; users?: unknown[] } = {}) {
  const chats = {
    findOne: jest.fn().mockResolvedValueOnce(over.byKey ?? null).mockResolvedValue(over.dm ?? null),
    insertOne: jest.fn().mockResolvedValue(undefined),
  };
  const participants = {
    find: jest
      .fn()
      .mockReturnValueOnce({ toArray: async () => over.mine ?? [] })
      .mockReturnValue({ toArray: async () => over.shared ?? [] }),
    insertMany: jest.fn().mockResolvedValue(undefined),
  };
  const users = {
    find: () => ({
      project: () => ({
        toArray: async () =>
          over.users ?? [
            { _id: new ObjectId(a), name: "Ada", displayPicture: "pa" },
            { _id: new ObjectId(b), name: "Bob", displayPicture: "pb" },
          ],
      }),
    }),
  };
  const db = { chats: () => chats, chatParticipants: () => participants, users: () => users };
  return { db: db as unknown as MongoDBClient, chats, participants };
}

describe("findOrCreateDm", () => {
  it("returns the DM found by its pair key without creating anything", async () => {
    const id = new ObjectId();
    const { db, chats } = makeDb({ byKey: { _id: id } });
    expect(await findOrCreateDm(db, a, b)).toEqual({ chatId: id.toString(), created: false });
    expect(chats.insertOne).not.toHaveBeenCalled();
  });

  it("finds an older DM by its two members", async () => {
    const id = new ObjectId();
    const { db } = makeDb({
      mine: [{ chatId: id.toString() }],
      shared: [{ chatId: id.toString() }],
      dm: { _id: id },
    });
    expect(await findOrCreateDm(db, a, b)).toEqual({ chatId: id.toString(), created: false });
  });

  it("creates a DM with the pair key and a row for each person when there is none", async () => {
    const { db, chats, participants } = makeDb();
    const result = await findOrCreateDm(db, a, b);
    expect(result?.created).toBe(true);
    expect(chats.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        chatType: "DM",
        dmKey: dmKeyFor(a, b),
        adminIds: [a, b],
        name: { [a]: "Ada", [b]: "Bob" },
      })
    );
    const rows = participants.insertMany.mock.calls[0][0];
    expect(rows.map((r: { userId: string }) => r.userId)).toEqual([a, b]);
    expect(rows.every((r: { chatId: string }) => r.chatId === result?.chatId)).toBe(true);
  });

  it("won't make a chat with someone who doesn't exist", async () => {
    const { db, chats } = makeDb({ users: [{ _id: new ObjectId(a), name: "Ada" }] });
    expect(await findOrCreateDm(db, a, b)).toBeNull();
    expect(chats.insertOne).not.toHaveBeenCalled();
  });
});
