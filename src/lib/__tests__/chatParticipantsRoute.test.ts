/**
 * @jest-environment node
 */
import { MongoBulkWriteError, ObjectId } from "mongodb";

import { verifyToken } from "@/lib/auth";
import { CHAT_PARTICIPANT_INDEX_NAME } from "@/lib/chatMembership";
import { emitViaSocketServer } from "@/lib/socket";
import handler from "@/pages/api/chats/[id]/participants";

const mockDb = {
  chats: jest.fn(),
  chatParticipants: jest.fn(),
  chatMessages: jest.fn(),
  chatInvites: jest.fn(),
  users: jest.fn(),
  getDb: jest.fn(),
};

jest.mock("@/lib/mongodb", () => ({
  MongoDBClient: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockImplementation(async () => mockDb),
    getDb: jest.fn().mockImplementation(async () => mockDb.getDb()),
  })),
}));

jest.mock("@/lib/auth", () => ({
  verifyToken: jest.fn(),
}));

jest.mock("@/lib/socket", () => ({
  emitViaSocketServer: jest.fn(),
}));

const verifyTokenMock = verifyToken as jest.Mock;
const emitMock = emitViaSocketServer as jest.Mock;

const adminId = new ObjectId().toString();
const memberId = new ObjectId().toString();
const thirdId = new ObjectId().toString();
const outsiderId = new ObjectId().toString();
const newUserA = new ObjectId().toString();
const newUserB = new ObjectId().toString();
const chatId = new ObjectId().toString();

const groupChat = {
  _id: new ObjectId(chatId),
  chatType: "Group",
  adminIds: [adminId],
  name: { group: "Test group" },
};

// Fixed ids so membership age (and therefore admin succession) is deterministic.
const adminRow = {
  _id: new ObjectId("600000000000000000000001"),
  chatId,
  userId: adminId,
  chatType: "Group",
};
const memberRow = {
  _id: new ObjectId("600000000000000000000002"),
  chatId,
  userId: memberId,
  chatType: "Group",
};
const thirdRow = {
  _id: new ObjectId("600000000000000000000003"),
  chatId,
  userId: thirdId,
  chatType: "Group",
};

type Row = { _id: ObjectId; chatId: string; userId: string };
let rows: Row[] = [];

const participantsCollection = {
  find: jest.fn(),
  findOne: jest.fn(),
  insertMany: jest.fn(),
  deleteMany: jest.fn(),
  createIndex: jest.fn(),
};
const chatsCollection = {
  findOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
};
const messagesCollection = { deleteMany: jest.fn() };
const invitesCollection = { deleteMany: jest.fn() };
const usersCollection = { find: jest.fn() };

const makeRes = () => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (body: unknown, overrides: Record<string, unknown> = {}) =>
  ({
    method: "POST",
    query: { id: chatId },
    cookies: { velo_12: "token" },
    body,
    ...overrides,
  }) as never;

const setParticipants = (next: Row[]) => {
  rows = [...next];
};

const setUsers = (ids: string[]) => {
  usersCollection.find.mockReturnValue({
    toArray: async () => ids.map((id) => ({ _id: new ObjectId(id), displayPicture: `${id}.png` })),
  });
};

const duplicateKeyError = (indexes: number[]) =>
  new MongoBulkWriteError(
    {
      message: "E11000 duplicate key error collection: Chat_Participants",
      code: 11000,
      writeErrors: indexes.map((index) => ({ index, code: 11000 })) as never,
    },
    {} as never
  );

beforeEach(() => {
  jest.clearAllMocks();
  verifyTokenMock.mockResolvedValue({ _id: adminId });
  emitMock.mockResolvedValue(undefined);
  mockDb.chats.mockReturnValue(chatsCollection);
  mockDb.chatParticipants.mockReturnValue(participantsCollection);
  mockDb.chatMessages.mockReturnValue(messagesCollection);
  mockDb.chatInvites.mockReturnValue(invitesCollection);
  mockDb.users.mockReturnValue(usersCollection);
  // A fresh object per call keeps the per-client index cache from leaking between tests.
  mockDb.getDb.mockImplementation(async () => ({ client: {}, databaseName: "test" }));
  chatsCollection.findOne.mockResolvedValue(groupChat);
  chatsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
  chatsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
  messagesCollection.deleteMany.mockResolvedValue({ deletedCount: 0 });
  invitesCollection.deleteMany.mockResolvedValue({ deletedCount: 0 });
  setParticipants([adminRow, memberRow]);
  setUsers([newUserA, newUserB]);

  participantsCollection.find.mockImplementation(() => ({ toArray: async () => [...rows] }));
  participantsCollection.findOne.mockImplementation(
    async (query: { userId: string }) => rows.find((row) => row.userId === query.userId) ?? null
  );
  participantsCollection.createIndex.mockResolvedValue(CHAT_PARTICIPANT_INDEX_NAME);
  participantsCollection.insertMany.mockImplementation(async (docs: Row[]) => {
    rows.push(...docs);
    return { insertedCount: docs.length };
  });
  participantsCollection.deleteMany.mockImplementation(
    async (query: { userId: { $in: string[] } }) => {
      const before = rows.length;
      rows = rows.filter((row) => !query.userId.$in.includes(row.userId));
      return { deletedCount: before - rows.length };
    }
  );
});

describe("POST /api/chats/[id]/participants", () => {
  it("rejects methods other than POST and DELETE", async () => {
    const res = makeRes();
    await handler(makeReq({ userIds: [newUserA] }, { method: "GET" }), res as never);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith("Allow", ["POST", "DELETE"]);
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated caller", async () => {
    const res = makeRes();
    await handler(makeReq({ userIds: [newUserA] }, { cookies: {} }), res as never);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
  });

  it("rejects an invalid chat id", async () => {
    const res = makeRes();
    await handler(makeReq({ userIds: [newUserA] }, { query: { id: "nope" } }), res as never);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it.each([
    ["a missing userIds array", {}],
    ["an empty userIds array", { userIds: [] }],
    ["a non-array userIds", { userIds: newUserA }],
    ["an invalid user id", { userIds: ["not-an-object-id"] }],
    ["more than 50 ids", { userIds: Array.from({ length: 51 }, () => new ObjectId().toString()) }],
  ])("rejects %s", async (_label, body) => {
    const res = makeRes();
    await handler(makeReq(body), res as never);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
  });

  it("returns 404 when the chat does not exist", async () => {
    chatsCollection.findOne.mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq({ userIds: [newUserA] }), res as never);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("refuses to add members to a DM", async () => {
    chatsCollection.findOne.mockResolvedValue({ ...groupChat, chatType: "DM" });
    const res = makeRes();
    await handler(makeReq({ userIds: [newUserA] }), res as never);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
  });

  it("refuses a caller who is not a member", async () => {
    verifyTokenMock.mockResolvedValue({ _id: outsiderId });
    const res = makeRes();
    await handler(makeReq({ userIds: [newUserA] }), res as never);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
  });

  it("refuses a member who is not an admin", async () => {
    verifyTokenMock.mockResolvedValue({ _id: memberId });
    const res = makeRes();
    await handler(makeReq({ userIds: [newUserA] }), res as never);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
  });

  it("is idempotent when every requested user is already a member", async () => {
    const res = makeRes();
    await handler(makeReq({ userIds: [adminId, memberId] }), res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
    expect(emitMock).not.toHaveBeenCalled();
  });

  it("returns 400 when none of the requested users exist", async () => {
    setUsers([]);
    const res = makeRes();
    await handler(makeReq({ userIds: [newUserA] }), res as never);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
  });

  it("adds only new, existing users and announces them once", async () => {
    const res = makeRes();
    await handler(
      makeReq({ userIds: [newUserA, newUserA, memberId, newUserB] }),
      res as never
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(participantsCollection.insertMany).toHaveBeenCalledTimes(1);

    const [inserted, options] = participantsCollection.insertMany.mock.calls[0];
    expect(options).toEqual({ ordered: false });
    expect(inserted).toHaveLength(2);
    expect(inserted.map((row: Row) => row.userId)).toEqual([newUserA, newUserB]);
    for (const row of inserted) {
      expect(row).toMatchObject({
        chatId,
        chatType: "Group",
        unreadCount: 0,
        archived: false,
        deleted: false,
      });
      expect(row.chatSettings.members).toEqual([adminId, memberId, newUserA, newUserB]);
    }

    expect(emitMock).toHaveBeenCalledWith(adminId, "chat:participantsAdded", {
      chatId,
      addedUserIds: [newUserA, newUserB],
    });

    const body = res.json.mock.calls[0][0];
    expect(body.added).toHaveLength(2);
    expect(body.participants).toHaveLength(4);
  });

  it("ensures the unique membership index before inserting", async () => {
    const res = makeRes();
    await handler(makeReq({ userIds: [newUserA] }), res as never);
    expect(participantsCollection.createIndex).toHaveBeenCalledWith(
      { chatId: 1, userId: 1 },
      { unique: true, name: CHAT_PARTICIPANT_INDEX_NAME }
    );
  });

  it("reports only the rows that survived a concurrent duplicate insert", async () => {
    participantsCollection.insertMany.mockImplementation(async (docs: Row[]) => {
      // A racing request already inserted the second user.
      rows.push(docs[0]);
      throw duplicateKeyError([1]);
    });

    const res = makeRes();
    await handler(makeReq({ userIds: [newUserA, newUserB] }), res as never);

    expect(res.status).toHaveBeenCalledWith(201);
    const body = res.json.mock.calls[0][0];
    expect(body.added.map((row: Row) => row.userId)).toEqual([newUserA]);
    expect(emitMock).toHaveBeenCalledWith(adminId, "chat:participantsAdded", {
      chatId,
      addedUserIds: [newUserA],
    });
  });

  it("fails on a write error that is not a duplicate key", async () => {
    participantsCollection.insertMany.mockRejectedValue(new Error("write concern failed"));
    const res = makeRes();
    await handler(makeReq({ userIds: [newUserA] }), res as never);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(emitMock).not.toHaveBeenCalled();
  });

  it("keeps the new members even if the realtime announcement fails", async () => {
    emitMock.mockRejectedValue(new Error("socket unreachable"));
    const res = makeRes();
    await handler(makeReq({ userIds: [newUserA] }), res as never);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(participantsCollection.insertMany).toHaveBeenCalledTimes(1);
  });
});

describe("DELETE /api/chats/[id]/participants", () => {
  const leave = (userIds: string[]) => makeReq({ userIds }, { method: "DELETE" });

  it("lets a non-admin member leave", async () => {
    verifyTokenMock.mockResolvedValue({ _id: memberId });
    const res = makeRes();
    await handler(leave([memberId]), res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(participantsCollection.deleteMany).toHaveBeenCalledWith({
      chatId,
      userId: { $in: [memberId] },
    });
    expect(emitMock).toHaveBeenCalledWith(memberId, "chat:participantsRemoved", {
      chatId,
      removedUserIds: [memberId],
    });

    const body = res.json.mock.calls[0][0];
    expect(body.removed).toEqual([memberId]);
    expect(body.participants.map((row: Row) => row.userId)).toEqual([adminId]);
    expect(body.adminIds).toEqual([adminId]);
    expect(body.chatDeleted).toBe(false);
    expect(chatsCollection.deleteOne).not.toHaveBeenCalled();
  });

  it("refuses a caller who is not a member", async () => {
    verifyTokenMock.mockResolvedValue({ _id: outsiderId });
    const res = makeRes();
    await handler(leave([outsiderId]), res as never);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(participantsCollection.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses a non-admin who tries to remove someone else", async () => {
    verifyTokenMock.mockResolvedValue({ _id: memberId });
    const res = makeRes();
    await handler(leave([adminId]), res as never);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(participantsCollection.deleteMany).not.toHaveBeenCalled();
  });

  it("lets an admin remove a regular member", async () => {
    const res = makeRes();
    await handler(leave([memberId]), res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.removed).toEqual([memberId]);
    expect(body.adminIds).toEqual([adminId]);
    expect(chatsCollection.updateOne).not.toHaveBeenCalled();
  });

  it("refuses to remove another admin", async () => {
    chatsCollection.findOne.mockResolvedValue({ ...groupChat, adminIds: [adminId, memberId] });
    const res = makeRes();
    await handler(leave([memberId]), res as never);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(participantsCollection.deleteMany).not.toHaveBeenCalled();
  });

  it("is idempotent when the target is not a member", async () => {
    const res = makeRes();
    await handler(leave([outsiderId]), res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].removed).toEqual([]);
    expect(participantsCollection.deleteMany).not.toHaveBeenCalled();
    expect(emitMock).not.toHaveBeenCalled();
  });

  it("promotes the longest-standing member when the last admin leaves", async () => {
    setParticipants([adminRow, thirdRow, memberRow]);
    const res = makeRes();
    await handler(leave([adminId]), res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(chatsCollection.updateOne).toHaveBeenCalledWith(
      { _id: groupChat._id },
      { $set: { adminIds: [memberId] } }
    );
    const body = res.json.mock.calls[0][0];
    expect(body.adminIds).toEqual([memberId]);
    expect(body.chatDeleted).toBe(false);
  });

  it("drops admin ids that no longer belong to a member", async () => {
    chatsCollection.findOne.mockResolvedValue({
      ...groupChat,
      adminIds: [adminId, outsiderId],
    });
    const res = makeRes();
    await handler(leave([memberId]), res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(chatsCollection.updateOne).toHaveBeenCalledWith(
      { _id: groupChat._id },
      { $set: { adminIds: [adminId] } }
    );
    expect(res.json.mock.calls[0][0].adminIds).toEqual([adminId]);
  });

  it("deletes the group when the last member leaves", async () => {
    setParticipants([adminRow]);
    const res = makeRes();
    await handler(leave([adminId]), res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(messagesCollection.deleteMany).toHaveBeenCalledWith({ chatId });
    expect(chatsCollection.deleteOne).toHaveBeenCalledWith({ _id: groupChat._id });
    expect(invitesCollection.deleteMany).toHaveBeenCalledWith({ chatId });
    const body = res.json.mock.calls[0][0];
    expect(body.chatDeleted).toBe(true);
    expect(body.adminIds).toEqual([]);
    expect(body.participants).toEqual([]);
  });

  it("keeps the removal even if the realtime announcement fails", async () => {
    emitMock.mockRejectedValue(new Error("socket unreachable"));
    const res = makeRes();
    await handler(leave([memberId]), res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(participantsCollection.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("refuses membership changes on a DM", async () => {
    chatsCollection.findOne.mockResolvedValue({ ...groupChat, chatType: "DM" });
    const res = makeRes();
    await handler(leave([memberId]), res as never);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(participantsCollection.deleteMany).not.toHaveBeenCalled();
  });
});