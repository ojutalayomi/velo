/**
 * @jest-environment node
 */
import { ObjectId } from "mongodb";

import { POST as reply } from "@/app/api/statuses/[id]/reply/route";
import { findOrCreateDm } from "@/lib/dmServer";
import { emitSequenceViaSocketServer } from "@/lib/socket";
import { getAuthenticatedUserId } from "@/lib/statusServer";

const statuses = { findOne: jest.fn() };
const followers = { findOne: jest.fn() };
const blocked = { findOne: jest.fn() };
const users = { findOne: jest.fn() };
const mockDb = {
  statuses: () => statuses,
  followers: () => followers,
  blockedUsers: () => blocked,
  users: () => users,
};

jest.mock("@/lib/mongodb", () => ({
  MongoDBClient: jest.fn().mockImplementation(() => ({ init: jest.fn().mockResolvedValue(mockDb) })),
}));
jest.mock("@/lib/socket", () => ({ emitSequenceViaSocketServer: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/dmServer", () => ({ findOrCreateDm: jest.fn() }));
jest.mock("@/lib/statusServer", () => ({
  ...jest.requireActual("@/lib/statusServer"),
  getAuthenticatedUserId: jest.fn(),
}));

const authMock = getAuthenticatedUserId as jest.Mock;
const dmMock = findOrCreateDm as jest.Mock;
const ownerId = new ObjectId().toString();
const fanId = new ObjectId().toString();
const statusId = new ObjectId().toString();
const chatId = new ObjectId().toString();

const call = (body: unknown, id = statusId) =>
  reply(
    new Request("http://x", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({ id }) }
  );

beforeEach(() => {
  jest.clearAllMocks();
  authMock.mockResolvedValue(fanId);
  statuses.findOne.mockResolvedValue({ _id: new ObjectId(statusId), userId: ownerId });
  followers.findOne.mockResolvedValue({ followerId: fanId });
  blocked.findOne.mockResolvedValue(null);
  users.findOne.mockResolvedValue({ name: "Fan", username: "fan", displayPicture: "p", verified: false });
  dmMock.mockResolvedValue({ chatId, created: false });
});

describe("POST /api/statuses/[id]/reply", () => {
  it("sends the reply as a message in the DM, naming the status but nothing else about it", async () => {
    const res = await call({ content: "  love this  " });
    expect(res.status).toBe(200);
    expect(emitSequenceViaSocketServer).toHaveBeenCalledTimes(1);
    const [sender, events] = (emitSequenceViaSocketServer as jest.Mock).mock.calls[0];
    expect(sender).toBe(fanId);
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("chatMessage");
    expect(events[0].payload).toMatchObject({
      chatId,
      receiverId: ownerId,
      content: "love this",
      chatType: "DM",
      messageType: "Text",
      statusReply: { statusId },
    });
    expect(Object.keys(events[0].payload.statusReply)).toEqual(["statusId"]);
    expect((await res.json()).data.chatId).toBe(chatId);
  });

  it("announces the chat first when this reply made it", async () => {
    dmMock.mockResolvedValue({ chatId, created: true });
    await call({ content: "hi" });
    const [, events] = (emitSequenceViaSocketServer as jest.Mock).mock.calls[0];
    expect(events.map((e: { event: string }) => e.event)).toEqual(["addChat", "chatMessage"]);
    expect(events[0].payload).toEqual({ chat: { _id: chatId } });
  });

  it("rejects empty and over-long replies", async () => {
    expect((await call({ content: "   " })).status).toBe(400);
    expect((await call({ content: "x".repeat(1001) })).status).toBe(400);
    expect((await call({})).status).toBe(400);
    expect(emitSequenceViaSocketServer).not.toHaveBeenCalled();
  });

  it("needs sign-in, a live status, and following the owner", async () => {
    authMock.mockResolvedValue(null);
    expect((await call({ content: "hi" })).status).toBe(401);
    authMock.mockResolvedValue(fanId);
    statuses.findOne.mockResolvedValue(null);
    expect((await call({ content: "hi" })).status).toBe(404);
    statuses.findOne.mockResolvedValue({ _id: new ObjectId(statusId), userId: ownerId });
    followers.findOne.mockResolvedValue(null);
    expect((await call({ content: "hi" })).status).toBe(403);
    expect((await call({ content: "hi" }, "nope")).status).toBe(400);
  });

  it("won't reply to your own status or to someone who blocked you", async () => {
    authMock.mockResolvedValue(ownerId);
    expect((await call({ content: "hi" })).status).toBe(400);
    authMock.mockResolvedValue(fanId);
    blocked.findOne.mockResolvedValue({ blockerId: ownerId });
    expect((await call({ content: "hi" })).status).toBe(403);
    expect(emitSequenceViaSocketServer).not.toHaveBeenCalled();
  });

  it("says so when the socket server can't take the message", async () => {
    (emitSequenceViaSocketServer as jest.Mock).mockRejectedValueOnce(new Error("down"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await call({ content: "hi" })).status).toBe(502);
  });
});
