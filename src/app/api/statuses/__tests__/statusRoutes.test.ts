/**
 * @jest-environment node
 */
import { ObjectId } from "mongodb";

import { GET as getViewers } from "@/app/api/statuses/[id]/viewers/route";
import { DELETE as unlike, POST as like } from "@/app/api/statuses/[id]/like/route";
import { emitViaSocketServer } from "@/lib/socket";
import { getAuthenticatedUserId } from "@/lib/statusServer";

const likes = {
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  countDocuments: jest.fn(),
  find: jest.fn(),
  createIndex: jest.fn(),
};
const views = { find: jest.fn() };
const statuses = { findOne: jest.fn() };
const followers = { findOne: jest.fn() };
const users = { find: jest.fn() };
const mockDb = {
  statusLikes: () => likes,
  statusViewers: () => views,
  statuses: () => statuses,
  followers: () => followers,
  users: () => users,
};

jest.mock("@/lib/mongodb", () => ({
  MongoDBClient: jest.fn().mockImplementation(() => ({ init: jest.fn().mockResolvedValue(mockDb) })),
}));
jest.mock("@/lib/socket", () => ({ emitViaSocketServer: jest.fn().mockResolvedValue(undefined) }));
// next/jest rewrites `import { after } from "next/server"` to this path, which doesn't exist here.
jest.mock(
  "next/dist/server/web/exports/after",
  () => ({ __esModule: true, default: (fn: () => unknown) => fn() }),
  { virtual: true }
);
jest.mock("@/lib/statusServer", () => ({
  ...jest.requireActual("@/lib/statusServer"),
  getAuthenticatedUserId: jest.fn(),
  ensureStatusIndexes: jest.fn(),
}));

const authMock = getAuthenticatedUserId as jest.Mock;
const ownerId = new ObjectId().toString();
const fanId = new ObjectId().toString();
const statusId = new ObjectId().toString();
const params = (id = statusId) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  jest.clearAllMocks();
  authMock.mockResolvedValue(fanId);
  statuses.findOne.mockResolvedValue({ _id: new ObjectId(statusId), userId: ownerId });
  followers.findOne.mockResolvedValue({ followerId: fanId, followedId: ownerId });
  likes.countDocuments.mockResolvedValue(3);
});

describe("POST /api/statuses/[id]/like", () => {
  it("likes once and answers with the new total, then tells the socket server", async () => {
    const res = await like(new Request("http://x"), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { liked: true, likeCount: 3 } });
    expect(likes.updateOne).toHaveBeenCalledWith(
      { statusId, userId: fanId },
      expect.objectContaining({ $setOnInsert: expect.objectContaining({ ownerId, userId: fanId }) }),
      { upsert: true }
    );
    expect(emitViaSocketServer).toHaveBeenCalledWith(fanId, "status:like", { statusId });
  });

  it("needs a signed-in user", async () => {
    authMock.mockResolvedValue(null);
    expect((await like(new Request("http://x"), params())).status).toBe(401);
  });

  it("refuses people who don't follow the owner", async () => {
    followers.findOne.mockResolvedValue(null);
    expect((await like(new Request("http://x"), params())).status).toBe(403);
    expect(likes.updateOne).not.toHaveBeenCalled();
  });

  it("lets the owner like their own status", async () => {
    authMock.mockResolvedValue(ownerId);
    followers.findOne.mockResolvedValue(null);
    expect((await like(new Request("http://x"), params())).status).toBe(200);
  });

  it("404s for an expired or missing status and 400s for a bad id", async () => {
    statuses.findOne.mockResolvedValue(null);
    expect((await like(new Request("http://x"), params())).status).toBe(404);
    expect((await like(new Request("http://x"), params("nope"))).status).toBe(400);
  });
});

describe("DELETE /api/statuses/[id]/like", () => {
  it("removes the like", async () => {
    const res = await unlike(new Request("http://x"), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { liked: false } });
    expect(likes.deleteOne).toHaveBeenCalledWith({ statusId, userId: fanId });
  });
});

describe("GET /api/statuses/[id]/viewers", () => {
  const viewerId = new ObjectId();
  beforeEach(() => {
    authMock.mockResolvedValue(ownerId);
    views.find.mockReturnValue({
      sort: () => ({
        limit: () => ({
          toArray: async () => [{ viewerId: viewerId.toString(), viewedAt: "2026-11-25T10:00:00.000Z" }],
        }),
      }),
    });
    likes.find.mockReturnValue({
      project: () => ({ toArray: async () => [{ userId: viewerId.toString() }] }),
    });
    users.find.mockReturnValue({
      project: () => ({
        toArray: async () => [{ _id: viewerId, name: "Grace", username: "grace", displayPicture: "p", verified: true }],
      }),
    });
  });

  it("lists who viewed it, with names and whether they liked it", async () => {
    const res = await getViewers(new Request("http://x"), params());
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual([
      {
        userId: viewerId.toString(),
        name: "Grace",
        username: "grace",
        displayPicture: "p",
        verified: true,
        viewedAt: "2026-11-25T10:00:00.000Z",
        liked: true,
      },
    ]);
  });

  it("is for the owner only", async () => {
    authMock.mockResolvedValue(fanId);
    expect((await getViewers(new Request("http://x"), params())).status).toBe(403);
    expect(views.find).not.toHaveBeenCalled();
  });
});
