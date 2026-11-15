/**
 * @jest-environment node
 */
import { MongoBulkWriteError, ObjectId } from "mongodb";

import { verifyToken } from "@/lib/auth";
import { hashInviteToken } from "@/lib/chatInvites";
import { emitViaSocketServer } from "@/lib/socket";
import { ChatInviteSchema } from "@/lib/types/type";
import handler from "@/pages/api/invites/[token]";

const mockDb = {
  chats: jest.fn(),
  chatParticipants: jest.fn(),
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
const joinerId = new ObjectId().toString();
const chatId = new ObjectId().toString();
const token = "9f".repeat(24);

const groupChat = {
  _id: new ObjectId(chatId),
  chatType: "Group",
  adminIds: [adminId],
  name: { group: "Test group" },
  groupDisplayPicture: "group.png",
};

type Row = { _id: ObjectId; chatId: string; userId: string; displayPicture?: string };

let rows: Row[] = [];
let inviteRow: ChatInviteSchema | null = null;

const chatsCollection = { findOne: jest.fn() };
const usersCollection = { findOne: jest.fn() };
const participantsCollection = {
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  insertMany: jest.fn(),
  createIndex: jest.fn(),
};
const invitesCollection = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
};

const makeRes = () => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (method: string, overrides: Record<string, unknown> = {}) =>
  ({
    method,
    query: { token },
    cookies: { velo_12: "session" },
    ...overrides,
  }) as never;

const bodyOf = (res: Record<string, jest.Mock>) => res.json.mock.calls[0][0];

const seedInvite = (overrides: Partial<ChatInviteSchema> = {}) => {
  inviteRow = {
    _id: new ObjectId(),
    chatId,
    tokenHash: hashInviteToken(token),
    enabled: true,
    createdBy: adminId,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    maxUses: null,
    uses: 0,
    ...overrides,
  };
  return inviteRow;
};

const duplicateKeyError = () =>
  new MongoBulkWriteError(
    {
      message: "E11000 duplicate key error collection: Chat_Participants",
      code: 11000,
      writeErrors: [{ index: 0, code: 11000 }] as never,
    },
    {} as never
  );

const blockedCases: {
  reason: string;
  overrides: Partial<ChatInviteSchema>;
  status: number;
}[] = [
  { reason: "expired", overrides: { expiresAt: new Date(Date.now() - 1000) }, status: 410 },
  { reason: "disabled", overrides: { enabled: false }, status: 410 },
  { reason: "full", overrides: { maxUses: 2, uses: 2 }, status: 410 },
];

/** Mirrors the atomic claim filter, including the $expr comparison of two fields. */
const matchesClaim = (row: ChatInviteSchema, filter: Record<string, any>) => {
  if (filter.tokenHash !== row.tokenHash) return false;
  if (filter.enabled !== undefined && row.enabled !== filter.enabled) return false;
  if (filter.expiresAt?.$gt && row.expiresAt.getTime() <= filter.expiresAt.$gt.getTime()) {
    return false;
  }
  if (!filter.$or) return true;
  return filter.$or.some((branch: Record<string, any>) => {
    if ("maxUses" in branch) return row.maxUses === branch.maxUses;
    if (branch.$expr) return row.maxUses !== null && row.uses < row.maxUses;
    return false;
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  rows = [
    { _id: new ObjectId("600000000000000000000001"), chatId, userId: adminId },
    { _id: new ObjectId("600000000000000000000002"), chatId, userId: memberId },
  ];
  seedInvite();
  verifyTokenMock.mockResolvedValue({ _id: joinerId });
  emitMock.mockResolvedValue(undefined);

  mockDb.chats.mockReturnValue(chatsCollection);
  mockDb.chatParticipants.mockReturnValue(participantsCollection);
  mockDb.chatInvites.mockReturnValue(invitesCollection);
  mockDb.users.mockReturnValue(usersCollection);
  // A fresh object per call keeps the per-client index cache from leaking between tests.
  mockDb.getDb.mockImplementation(async () => ({ client: {}, databaseName: "test" }));

  chatsCollection.findOne.mockResolvedValue(groupChat);
  usersCollection.findOne.mockResolvedValue({
    _id: new ObjectId(joinerId),
    displayPicture: "joiner.png",
  });

  participantsCollection.find.mockImplementation(() => ({ toArray: async () => [...rows] }));
  participantsCollection.findOne.mockImplementation(
    async (query: { userId: string }) => rows.find((row) => row.userId === query.userId) ?? null
  );
  participantsCollection.countDocuments.mockImplementation(async () => rows.length);
  participantsCollection.createIndex.mockResolvedValue("ok");
  participantsCollection.insertMany.mockImplementation(async (docs: Row[]) => {
    rows.push(...docs);
    return { insertedCount: docs.length };
  });

  invitesCollection.findOne.mockImplementation(async (query: { tokenHash: string }) =>
    inviteRow && inviteRow.tokenHash === query.tokenHash ? inviteRow : null
  );
  invitesCollection.findOneAndUpdate.mockImplementation(
    async (filter: Record<string, any>, update: { $inc?: Record<string, number> }) => {
      if (!inviteRow || !matchesClaim(inviteRow, filter)) return null;
      for (const [field, amount] of Object.entries(update.$inc ?? {})) {
        (inviteRow as unknown as Record<string, number>)[field] += amount;
      }
      return inviteRow;
    }
  );
  invitesCollection.updateOne.mockImplementation(
    async (query: { tokenHash: string }, update: { $inc?: Record<string, number> }) => {
      if (!inviteRow || inviteRow.tokenHash !== query.tokenHash) return { modifiedCount: 0 };
      for (const [field, amount] of Object.entries(update.$inc ?? {})) {
        (inviteRow as unknown as Record<string, number>)[field] += amount;
      }
      return { modifiedCount: 1 };
    }
  );
});

describe("/api/invites/[token] token handling", () => {
  it.each(["PUT", "DELETE", "PATCH"])("rejects %s", async (method) => {
    const res = makeRes();
    await handler(makeReq(method), res as never);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith("Allow", ["GET", "POST"]);
  });

  it.each(["", "abc", "9F".repeat(24), "9f".repeat(23), "9f".repeat(25), "z".repeat(48)])(
    "rejects the malformed token %p",
    async (badToken) => {
      const res = makeRes();
      await handler(makeReq("GET", { query: { token: badToken } }), res as never);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(bodyOf(res).reason).toBe("not_found");
      expect(invitesCollection.findOne).not.toHaveBeenCalled();
    }
  );

  it("rejects a well-formed token that does not match any hash", async () => {
    const res = makeRes();
    await handler(makeReq("GET", { query: { token: "ab".repeat(24) } }), res as never);
    expect(bodyOf(res)).toMatchObject({ valid: false, reason: "not_found" });
    expect(invitesCollection.findOne).toHaveBeenCalledWith({
      tokenHash: hashInviteToken("ab".repeat(24)),
    });
  });

  it("refuses to join with a well-formed token that does not match any hash", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { query: { token: "ab".repeat(24) } }), res as never);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
  });

  it("looks the invite up by hash, never by the raw token", async () => {
    const res = makeRes();
    await handler(makeReq("GET"), res as never);
    expect(invitesCollection.findOne).toHaveBeenCalledWith({ tokenHash: hashInviteToken(token) });
    expect(JSON.stringify(inviteRow)).not.toContain(token);
  });
});

describe("GET /api/invites/[token]", () => {
  it("previews the group for a signed-out visitor", async () => {
    const res = makeRes();
    await handler(makeReq("GET", { cookies: {} }), res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(bodyOf(res)).toEqual({
      valid: true,
      reason: null,
      chatId,
      name: "Test group",
      displayPicture: "group.png",
      memberCount: 2,
      isMember: false,
    });
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
  });

  it("never returns the token or its hash", async () => {
    const res = makeRes();
    await handler(makeReq("GET"), res as never);
    const serialized = JSON.stringify(bodyOf(res));
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain(hashInviteToken(token));
  });

  it("tells a member they are already in the group", async () => {
    verifyTokenMock.mockResolvedValue({ _id: memberId });
    const res = makeRes();
    await handler(makeReq("GET"), res as never);
    expect(bodyOf(res).isMember).toBe(true);
  });

  it("reports an unknown link as not_found", async () => {
    inviteRow = null;
    const res = makeRes();
    await handler(makeReq("GET"), res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(bodyOf(res)).toMatchObject({ valid: false, reason: "not_found", chatId: "" });
  });

  it("reports a link whose group was deleted as not_found", async () => {
    chatsCollection.findOne.mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq("GET"), res as never);
    expect(bodyOf(res)).toMatchObject({ valid: false, reason: "not_found" });
  });

  // The TTL monitor lags, so an expired row can still be present.
  it.each(blockedCases)("reports a $reason link", async ({ reason, overrides }) => {
    seedInvite(overrides);
    const res = makeRes();
    await handler(makeReq("GET"), res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(bodyOf(res)).toMatchObject({ valid: false, reason, name: "Test group" });
  });
});

describe("POST /api/invites/[token]", () => {
  it("requires a session", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { cookies: {} }), res as never);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
    expect(inviteRow?.uses).toBe(0);
  });

  it("joins the group, burns one use and announces the new member", async () => {
    const res = makeRes();
    await handler(makeReq("POST"), res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(bodyOf(res)).toEqual({ chatId, alreadyMember: false });

    const inserted = rows.find((row) => row.userId === joinerId);
    expect(inserted).toBeDefined();
    expect(inserted?.displayPicture).toBe("joiner.png");
    expect(inviteRow?.uses).toBe(1);
    expect(emitMock).toHaveBeenCalledWith(joinerId, "chat:participantsAdded", {
      chatId,
      addedUserIds: [joinerId],
    });
  });

  it("stores membership settings for the joiner", async () => {
    const res = makeRes();
    await handler(makeReq("POST"), res as never);
    const doc = participantsCollection.insertMany.mock.calls[0][0][0];
    expect(doc.chatId).toBe(chatId);
    expect(doc.chatType).toBe("Group");
    expect(doc.unreadCount).toBe(0);
    expect(doc.chatSettings.members).toEqual([adminId, memberId, joinerId]);
  });

  it("does not burn a use when the caller is already a member", async () => {
    verifyTokenMock.mockResolvedValue({ _id: memberId });
    const res = makeRes();
    await handler(makeReq("POST"), res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(bodyOf(res)).toEqual({ chatId, alreadyMember: true });
    expect(inviteRow?.uses).toBe(0);
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
    expect(emitMock).not.toHaveBeenCalled();
  });

  it.each(blockedCases)("refuses a $reason link", async ({ reason, overrides, status }) => {
    seedInvite(overrides);
    const res = makeRes();
    await handler(makeReq("POST"), res as never);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(bodyOf(res).reason).toBe(reason);
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
    expect(inviteRow?.uses).toBe(overrides.uses ?? 0);
  });

  it("refuses an unknown link", async () => {
    inviteRow = null;
    const res = makeRes();
    await handler(makeReq("POST"), res as never);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
  });

  it("refuses a link whose group is gone", async () => {
    chatsCollection.findOne.mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq("POST"), res as never);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(inviteRow?.uses).toBe(0);
  });

  it("refuses a link that points at a DM", async () => {
    chatsCollection.findOne.mockResolvedValue({ ...groupChat, chatType: "DM" });
    const res = makeRes();
    await handler(makeReq("POST"), res as never);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(inviteRow?.uses).toBe(0);
  });

  it("refuses a session whose user no longer exists", async () => {
    usersCollection.findOne.mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq("POST"), res as never);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(inviteRow?.uses).toBe(0);
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
  });

  it("stops at the cap when the last slot is taken concurrently", async () => {
    seedInvite({ maxUses: 1, uses: 0 });
    let reads = 0;
    invitesCollection.findOne.mockImplementation(async () => {
      reads += 1;
      return { ...inviteRow, uses: reads === 1 ? 0 : 1 } as ChatInviteSchema;
    });
    invitesCollection.findOneAndUpdate.mockResolvedValue(null);

    const res = makeRes();
    await handler(makeReq("POST"), res as never);
    expect(res.status).toHaveBeenCalledWith(410);
    expect(bodyOf(res).reason).toBe("full");
    expect(participantsCollection.insertMany).not.toHaveBeenCalled();
  });

  it("refunds the use when a concurrent insert made the caller a member", async () => {
    participantsCollection.insertMany.mockRejectedValue(duplicateKeyError());
    const res = makeRes();
    await handler(makeReq("POST"), res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(bodyOf(res)).toEqual({ chatId, alreadyMember: true });
    expect(inviteRow?.uses).toBe(0);
    expect(emitMock).not.toHaveBeenCalled();
  });

  it("refunds the use when the membership write fails", async () => {
    participantsCollection.insertMany.mockRejectedValue(new Error("write failed"));
    const res = makeRes();
    await handler(makeReq("POST"), res as never);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(inviteRow?.uses).toBe(0);
  });

  it("still joins when the realtime announcement fails", async () => {
    emitMock.mockRejectedValue(new Error("socket down"));
    const res = makeRes();
    await handler(makeReq("POST"), res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(rows.some((row) => row.userId === joinerId)).toBe(true);
    expect(inviteRow?.uses).toBe(1);
  });

  it("allows unlimited joins when no cap is set", async () => {
    seedInvite({ maxUses: null, uses: 40 });
    const res = makeRes();
    await handler(makeReq("POST"), res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(inviteRow?.uses).toBe(41);
  });
});