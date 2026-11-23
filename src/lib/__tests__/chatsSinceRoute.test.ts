/**
 * @jest-environment node
 */
import { ObjectId } from "mongodb";

import { verifyToken } from "@/lib/auth";
import handler from "@/pages/api/chats";

const mockDb = {
  chats: jest.fn(),
  chatParticipants: jest.fn(),
  chatMessages: jest.fn(),
  readReceipts: jest.fn(),
  chatReactions: jest.fn(),
  files: jest.fn(),
  users: jest.fn(),
};
const mockInit = jest.fn();

jest.mock("@/lib/mongodb", () => ({
  MongoDBClient: jest.fn().mockImplementation(() => ({ init: mockInit })),
}));

jest.mock("@/lib/auth", () => ({ verifyToken: jest.fn() }));
jest.mock("@/lib/socket", () => ({
  emitViaSocketServer: jest.fn(),
  emitSequenceViaSocketServer: jest.fn(),
}));

const verifyTokenMock = verifyToken as jest.Mock;

const userId = new ObjectId().toString();
const chatId = new ObjectId().toString();

const groupChat = {
  _id: new ObjectId(chatId),
  chatType: "Group",
  adminIds: [userId],
  name: { group: "Test group" },
};
const participantRow = { _id: new ObjectId(), chatId, userId, chatType: "Group" };

const message = (extra: Record<string, unknown> = {}) => ({
  _id: new ObjectId(),
  chatId,
  content: "hello",
  timestamp: "2026-06-10T10:00:00.000Z",
  attachments: [],
  sender: { id: userId },
  ...extra,
});

/** Mongo cursor stand-in: chainable, resolves to `rows` at toArray(). */
const cursor = (rows: unknown[]) => {
  const c: Record<string, jest.Mock> = {};
  for (const name of ["sort", "skip", "limit", "project"]) c[name] = jest.fn(() => c);
  c.toArray = jest.fn(async () => rows);
  return c;
};

let messageRows: unknown[];
let readSinceRows: unknown[];
let messagesFind: jest.Mock;
let receiptsFind: jest.Mock;

/** The "read since" lookup is the only receipts query that filters on readAt. */
const sinceLookups = () => receiptsFind.mock.calls.filter(([filter]) => filter && "readAt" in filter);

function makeRes() {
  const res: { status: jest.Mock; json: jest.Mock; setHeader: jest.Mock; end: jest.Mock } = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    setHeader: jest.fn(),
    end: jest.fn(),
  };
  return res;
}

async function get(query: Record<string, string> = {}) {
  const res = makeRes();
  await handler({ method: "GET", query, cookies: { velo_12: "token" } } as never, res as never);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockInit.mockResolvedValue(mockDb);
  verifyTokenMock.mockResolvedValue({ _id: userId, exp: 9999999999 });
  messageRows = [];
  readSinceRows = [];

  messagesFind = jest.fn(() => cursor(messageRows));
  receiptsFind = jest.fn((filter: Record<string, unknown>) =>
    cursor("readAt" in filter ? readSinceRows : [])
  );

  mockDb.chatParticipants.mockReturnValue({ find: jest.fn(() => cursor([participantRow])) });
  mockDb.chats.mockReturnValue({ find: jest.fn(() => cursor([groupChat])) });
  mockDb.chatMessages.mockReturnValue({ find: messagesFind });
  mockDb.readReceipts.mockReturnValue({ find: receiptsFind });
  mockDb.chatReactions.mockReturnValue({ find: jest.fn(() => cursor([])) });
  mockDb.files.mockReturnValue({ find: jest.fn(() => cursor([])) });
  mockDb.users.mockReturnValue({
    find: jest.fn(() => cursor([])),
    findOne: jest.fn(async () => null),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("GET /api/chats (full load)", () => {
  it("applies no change filter and skips the read-receipt lookup", async () => {
    await get();

    const filter = messagesFind.mock.calls[0][0];
    expect(filter).not.toHaveProperty("$and");
    expect(filter.$or).toEqual([
      { chatId: { $in: [chatId] } },
      { receiverId: userId },
    ]);
    expect(sinceLookups()).toHaveLength(0);
  });

  it("returns a serverTime for the client to use as its next cursor", async () => {
    const res = await get();

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(new Date(body.serverTime).toISOString()).toBe(body.serverTime);
  });
});

describe("GET /api/chats?since=", () => {
  const since = "2026-06-10T11:00:00.000Z";

  it("restricts to visible messages that changed after since", async () => {
    await get({ since });

    const filter = messagesFind.mock.calls[0][0];
    expect(filter.$and).toHaveLength(2);
    expect(filter.$and[0].$or).toEqual([
      { chatId: { $in: [chatId] } },
      { receiverId: userId },
    ]);
    expect(filter.$and[1].$or).toEqual([
      { updatedAt: { $gt: since } },
      { updatedAt: { $exists: false }, timestamp: { $gt: since } },
    ]);
  });

  it("normalises the cursor before using it", async () => {
    await get({ since: "2026-06-10T11:00:00Z" });

    expect(messagesFind.mock.calls[0][0].$and[1].$or[0]).toEqual({ updatedAt: { $gt: since } });
  });

  it("also pulls in messages that were read after since", async () => {
    const readId = new ObjectId();
    readSinceRows = [{ messageId: readId.toString() }];

    await get({ since });

    expect(sinceLookups()).toHaveLength(1);
    expect(sinceLookups()[0][0]).toEqual({ chatId: { $in: [chatId] }, readAt: { $gt: since } });
    expect(messagesFind.mock.calls[0][0].$and[1].$or).toContainEqual({ _id: { $in: [readId] } });
  });

  it("returns deletion tombstones and new messages as ordinary messages", async () => {
    const placeholder = message({
      content: "This message was deleted.≤≤≤",
      updatedAt: "2026-06-10T11:30:00.000Z",
    });
    const fresh = message({ updatedAt: "2026-06-10T11:40:00.000Z" });
    messageRows = [placeholder, fresh];

    const res = await get({ since });

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.messages.map((m: { _id: string }) => m._id)).toEqual([
      placeholder._id.toString(),
      fresh._id.toString(),
    ]);
    expect(body.messages[0].content).toBe("This message was deleted.≤≤≤");
    // The chat list always comes back in full so the client can spot deleted chats.
    expect(body.chats).toHaveLength(1);
    expect(body.requestId).toBe(userId);
  });

  it("flags an oversized delta via pagination.hasMore so the client reloads in full", async () => {
    messageRows = [message(), message(), message()];

    const res = await get({ since, messageLimit: "2" });

    const body = res.json.mock.calls[0][0];
    expect(body.messages).toHaveLength(2);
    expect(body.pagination.messages.hasMore).toBe(true);
  });

  it("takes serverTime before querying, so writes during the request are re-sent next time", async () => {
    jest.useFakeTimers({ now: new Date("2026-06-10T12:00:00.000Z") });
    messagesFind.mockImplementation(() => {
      // Time passes while the queries run.
      jest.setSystemTime(new Date("2026-06-10T12:00:05.000Z"));
      return cursor(messageRows);
    });

    const res = await get({ since });

    expect(res.json.mock.calls[0][0].serverTime).toBe("2026-06-10T12:00:00.000Z");
  });

  it.each([
    ["not a date", "yesterday"],
    ["empty", ""],
    ["in the future", "2999-01-01T00:00:00.000Z"],
  ])("treats a cursor that is %s as a full load", async (_label, bad) => {
    await get({ since: bad });

    expect(messagesFind.mock.calls[0][0]).not.toHaveProperty("$and");
    expect(sinceLookups()).toHaveLength(0);
  });

  it("requires authentication like every other chats request", async () => {
    const res = makeRes();
    await handler({ method: "GET", query: { since }, cookies: {} } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(messagesFind).not.toHaveBeenCalled();
  });
});

describe("database connection", () => {
  it("does not cache a failed connection forever", async () => {
    jest.resetModules();
    mockInit.mockReset();
    mockInit.mockRejectedValueOnce(new Error("mongo down")).mockResolvedValue(mockDb);
    const fresh = (await import("@/pages/api/chats")).default;
    const { verifyToken: freshVerify } = await import("@/lib/auth");
    (freshVerify as jest.Mock).mockResolvedValue({ _id: userId, exp: 9999999999 });
    const request = { method: "GET", query: {}, cookies: { velo_12: "token" } } as never;

    await expect(fresh(request, makeRes() as never)).rejects.toThrow("mongo down");

    const res = makeRes();
    await fresh(request, res as never);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
