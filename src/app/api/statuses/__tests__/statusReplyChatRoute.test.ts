/**
 * @jest-environment node
 */
import { ObjectId } from "mongodb";

import { POST } from "@/app/api/statuses/[id]/reply-chat/route";
import { findOrCreateDm } from "@/lib/dmServer";
import { emitViaSocketServer } from "@/lib/socket";
import { getAuthenticatedUserId } from "@/lib/statusServer";

const statuses = { findOne: jest.fn() };
const followers = { findOne: jest.fn() };
const blocked = { findOne: jest.fn() };
const mockDb = { statuses: () => statuses, followers: () => followers, blockedUsers: () => blocked };

jest.mock("@/lib/mongodb", () => ({
  MongoDBClient: jest.fn().mockImplementation(() => ({ init: jest.fn().mockResolvedValue(mockDb) })),
}));
jest.mock("@/lib/socket", () => ({ emitViaSocketServer: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/dmServer", () => ({ findOrCreateDm: jest.fn() }));
jest.mock("@/lib/statusServer", () => ({
  ...jest.requireActual("@/lib/statusServer"),
  getAuthenticatedUserId: jest.fn(),
}));

const ownerId = new ObjectId().toString();
const fanId = new ObjectId().toString();
const statusId = new ObjectId().toString();
const chatId = new ObjectId().toString();
const call = (id = statusId) => POST(new Request("http://x", { method: "POST" }), { params: Promise.resolve({ id }) });

beforeEach(() => {
  jest.clearAllMocks();
  (getAuthenticatedUserId as jest.Mock).mockResolvedValue(fanId);
  statuses.findOne.mockResolvedValue({ _id: new ObjectId(statusId), userId: ownerId });
  followers.findOne.mockResolvedValue({ followerId: fanId });
  blocked.findOne.mockResolvedValue(null);
  (findOrCreateDm as jest.Mock).mockResolvedValue({ chatId, created: false });
});

describe("POST /api/statuses/[id]/reply-chat", () => {
  it("returns the DM and who it's with", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ chatId, receiverId: ownerId });
    expect(emitViaSocketServer).not.toHaveBeenCalled();
  });

  it("announces a brand-new DM first", async () => {
    (findOrCreateDm as jest.Mock).mockResolvedValue({ chatId, created: true });
    await call();
    expect(emitViaSocketServer).toHaveBeenCalledWith(fanId, "addChat", { chat: { _id: chatId } });
  });

  it("applies the same rules as a text reply", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValueOnce(null);
    expect((await call()).status).toBe(401);
    expect((await call("nope")).status).toBe(400);
    followers.findOne.mockResolvedValue(null);
    expect((await call()).status).toBe(403);
    followers.findOne.mockResolvedValue({ followerId: fanId });
    blocked.findOne.mockResolvedValue({ _id: 1 });
    expect((await call()).status).toBe(403);
    blocked.findOne.mockResolvedValue(null);
    statuses.findOne.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
    statuses.findOne.mockResolvedValue({ _id: new ObjectId(statusId), userId: fanId });
    expect((await call()).status).toBe(400);
  });
});
