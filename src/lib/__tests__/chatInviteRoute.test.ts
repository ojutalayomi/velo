/**
 * @jest-environment node
 */
import { ObjectId } from "mongodb";

import { verifyToken } from "@/lib/auth";
import { hashInviteToken } from "@/lib/chatInvites";
import { ChatInviteSchema } from "@/lib/types/type";
import handler from "@/pages/api/chats/[id]/invite";

const mockDb = {
  chats: jest.fn(),
  chatParticipants: jest.fn(),
  chatInvites: jest.fn(),
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

const verifyTokenMock = verifyToken as jest.Mock;

const adminId = new ObjectId().toString();
const memberId = new ObjectId().toString();
const chatId = new ObjectId().toString();

const groupChat = {
  _id: new ObjectId(chatId),
  chatType: "Group",
  adminIds: [adminId],
  name: { group: "Test group" },
};

const chatsCollection = { findOne: jest.fn() };
const participantsCollection = { findOne: jest.fn() };
const invitesCollection = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  createIndex: jest.fn(),
};

let inviteRow: ChatInviteSchema | null = null;

const makeRes = () => {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (method: string, body?: unknown) =>
  ({
    method,
    query: { id: chatId },
    cookies: { velo_12: "token" },
    body,
  }) as never;

const bodyOf = (res: Record<string, jest.Mock>) => res.json.mock.calls[0][0];

const seedInvite = (overrides: Partial<ChatInviteSchema> = {}) => {
  inviteRow = {
    _id: new ObjectId(),
    chatId,
    tokenHash: hashInviteToken("a".repeat(48)),
    enabled: true,
    createdBy: adminId,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    maxUses: null,
    uses: 3,
    ...overrides,
  };
  return inviteRow;
};

beforeEach(() => {
  jest.clearAllMocks();
  inviteRow = null;
  verifyTokenMock.mockResolvedValue({ _id: adminId });
  mockDb.chats.mockReturnValue(chatsCollection);
  mockDb.chatParticipants.mockReturnValue(participantsCollection);
  mockDb.chatInvites.mockReturnValue(invitesCollection);
  // A fresh object per call keeps the per-client index cache from leaking between tests.
  mockDb.getDb.mockImplementation(async () => ({ client: {}, databaseName: "test" }));
  chatsCollection.findOne.mockResolvedValue(groupChat);
  participantsCollection.findOne.mockImplementation(async (query: { userId: string }) =>
    query.userId === adminId || query.userId === memberId ? { _id: new ObjectId() } : null
  );
  invitesCollection.createIndex.mockResolvedValue("ok");
  invitesCollection.findOne.mockImplementation(async (query: { chatId?: string }) =>
    inviteRow && inviteRow.chatId === query.chatId ? inviteRow : null
  );
  invitesCollection.findOneAndUpdate.mockImplementation(
    async (
      filter: { chatId: string },
      update: { $set?: Partial<ChatInviteSchema>; $inc?: Record<string, number> },
      options?: { upsert?: boolean }
    ) => {
      const current = inviteRow && inviteRow.chatId === filter.chatId ? inviteRow : null;
      if (!current && !options?.upsert) return null;
      const next = {
        ...(current ?? { _id: new ObjectId(), chatId: filter.chatId }),
        ...(update.$set ?? {}),
      } as ChatInviteSchema;
      for (const [field, amount] of Object.entries(update.$inc ?? {})) {
        (next as unknown as Record<string, number>)[field] += amount;
      }
      inviteRow = next;
      return next;
    }
  );
});

describe("/api/chats/[id]/invite access control", () => {
  it.each(["DELETE", "PATCH", "HEAD"])("rejects %s", async (method) => {
    const res = makeRes();
    await handler(makeReq(method), res as never);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith("Allow", ["GET", "POST", "PUT"]);
  });

  it("rejects a caller with no cookie", async () => {
    const res = makeRes();
    await handler(
      { method: "GET", query: { id: chatId }, cookies: {} } as never,
      res as never
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rejects an invalid session token", async () => {
    verifyTokenMock.mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq("GET"), res as never);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rejects an invalid chat id", async () => {
    const res = makeRes();
    await handler(
      { method: "GET", query: { id: "nope" }, cookies: { velo_12: "token" } } as never,
      res as never
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when the chat does not exist", async () => {
    chatsCollection.findOne.mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq("GET"), res as never);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("refuses invite links for a DM", async () => {
    chatsCollection.findOne.mockResolvedValue({ ...groupChat, chatType: "DM" });
    const res = makeRes();
    await handler(makeReq("POST", {}), res as never);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(invitesCollection.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("refuses a caller who is not a member", async () => {
    verifyTokenMock.mockResolvedValue({ _id: new ObjectId().toString() });
    const res = makeRes();
    await handler(makeReq("GET"), res as never);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("refuses a member who is not an admin", async () => {
    verifyTokenMock.mockResolvedValue({ _id: memberId });
    const res = makeRes();
    await handler(makeReq("POST", {}), res as never);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(invitesCollection.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each(["POST", "PUT"])("rejects a non-object body on %s", async (method) => {
    const res = makeRes();
    await handler(makeReq(method, [1, 2]), res as never);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("GET /api/chats/[id]/invite", () => {
  it("reports that no link exists yet", async () => {
    const res = makeRes();
    await handler(makeReq("GET"), res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(bodyOf(res)).toEqual({
      exists: false,
      enabled: false,
      expiresAt: null,
      maxUses: null,
      uses: 0,
    });
  });

  it("returns metadata without the link, the token or its hash", async () => {
    const invite = seedInvite({ maxUses: 10 });
    const res = makeRes();
    await handler(makeReq("GET"), res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(bodyOf(res)).toEqual({
      exists: true,
      enabled: true,
      expiresAt: invite.expiresAt.toISOString(),
      maxUses: 10,
      uses: 3,
    });
    const serialized = JSON.stringify(bodyOf(res));
    expect(serialized).not.toContain(invite.tokenHash);
    expect(serialized).not.toContain("a".repeat(48));
  });
});

describe("POST /api/chats/[id]/invite", () => {
  it("creates a link and stores only its hash", async () => {
    const res = makeRes();
    await handler(makeReq("POST", {}), res as never);
    expect(res.status).toHaveBeenCalledWith(200);

    const body = bodyOf(res);
    expect(body.link).toMatch(/^\/invite\/[0-9a-f]{48}$/);
    const token = body.link.replace("/invite/", "");
    expect(inviteRow?.tokenHash).toBe(hashInviteToken(token));
    expect(JSON.stringify(inviteRow)).not.toContain(token);
    expect(body.uses).toBe(0);
    expect(body.enabled).toBe(true);
    expect(body.exists).toBe(true);
  });

  it("defaults to a seven day expiry and no join limit", async () => {
    const before = Date.now();
    const res = makeRes();
    await handler(makeReq("POST", {}), res as never);
    const expiresAt = new Date(bodyOf(res).expiresAt).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + 7 * 24 * 60 * 60 * 1000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 7 * 24 * 60 * 60 * 1000);
    expect(bodyOf(res).maxUses).toBeNull();
  });

  it("honours the requested expiry and join limit", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { expiresInHours: 24, maxUses: 5 }), res as never);
    expect(bodyOf(res).maxUses).toBe(5);
    const expiresAt = new Date(bodyOf(res).expiresAt).getTime();
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000);
    expect(expiresAt).toBeGreaterThan(Date.now());
  });

  it("rotates the token and resets the join count", async () => {
    const previous = seedInvite({ uses: 9, maxUses: 10 });
    const res = makeRes();
    await handler(makeReq("POST", { maxUses: 10 }), res as never);
    const token = bodyOf(res).link.replace("/invite/", "");
    expect(inviteRow?.tokenHash).not.toBe(previous.tokenHash);
    expect(inviteRow?.tokenHash).toBe(hashInviteToken(token));
    expect(inviteRow?.uses).toBe(0);
    expect(inviteRow?.enabled).toBe(true);
  });

  it("keeps one row per group", async () => {
    seedInvite();
    const res = makeRes();
    await handler(makeReq("POST", {}), res as never);
    expect(invitesCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { chatId },
      expect.anything(),
      expect.objectContaining({ upsert: true })
    );
  });

  it.each([0, 721, 1.5, "24", null])("rejects expiresInHours %p", async (hours) => {
    const res = makeRes();
    await handler(makeReq("POST", { expiresInHours: hours }), res as never);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(invitesCollection.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1001, 2.5, "5"])("rejects maxUses %p", async (maxUses) => {
    const res = makeRes();
    await handler(makeReq("POST", { maxUses }), res as never);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(invitesCollection.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("creates the unique and TTL indexes", async () => {
    const res = makeRes();
    await handler(makeReq("POST", {}), res as never);
    expect(invitesCollection.createIndex).toHaveBeenCalledWith(
      { chatId: 1 },
      expect.objectContaining({ unique: true })
    );
    expect(invitesCollection.createIndex).toHaveBeenCalledWith(
      { tokenHash: 1 },
      expect.objectContaining({ unique: true })
    );
    expect(invitesCollection.createIndex).toHaveBeenCalledWith(
      { expiresAt: 1 },
      expect.objectContaining({ expireAfterSeconds: 0 })
    );
  });
});

describe("PUT /api/chats/[id]/invite", () => {
  it("turns the link off without rotating the token", async () => {
    const previous = seedInvite();
    const res = makeRes();
    await handler(makeReq("PUT", { enabled: false }), res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(bodyOf(res).enabled).toBe(false);
    expect(bodyOf(res).link).toBeUndefined();
    expect(inviteRow?.tokenHash).toBe(previous.tokenHash);
    expect(inviteRow?.uses).toBe(previous.uses);
  });

  it("changes the join limit without resetting the count", async () => {
    seedInvite({ uses: 4 });
    const res = makeRes();
    await handler(makeReq("PUT", { maxUses: 25 }), res as never);
    expect(bodyOf(res).maxUses).toBe(25);
    expect(bodyOf(res).uses).toBe(4);
  });

  it("clears the join limit", async () => {
    seedInvite({ maxUses: 5 });
    const res = makeRes();
    await handler(makeReq("PUT", { maxUses: null }), res as never);
    expect(bodyOf(res).maxUses).toBeNull();
  });

  it("extends the expiry from now", async () => {
    seedInvite({ expiresAt: new Date(Date.now() - 1000) });
    const res = makeRes();
    await handler(makeReq("PUT", { expiresInHours: 24 }), res as never);
    expect(new Date(bodyOf(res).expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("returns 404 when the group has no link yet", async () => {
    const res = makeRes();
    await handler(makeReq("PUT", { enabled: true }), res as never);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("rejects an empty update", async () => {
    seedInvite();
    const res = makeRes();
    await handler(makeReq("PUT", {}), res as never);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it.each([
    ["a non-boolean enabled", { enabled: "yes" }],
    ["an out-of-range expiry", { expiresInHours: 900 }],
    ["an out-of-range join limit", { maxUses: 5000 }],
  ])("rejects %s", async (_label, body) => {
    seedInvite();
    const res = makeRes();
    await handler(makeReq("PUT", body), res as never);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});