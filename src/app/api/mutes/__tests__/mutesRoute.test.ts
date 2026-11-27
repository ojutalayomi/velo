/**
 * @jest-environment node
 */
import { ObjectId } from "mongodb";

import { DELETE, GET, POST } from "@/app/api/mutes/route";
import { getSessionUserId } from "@/lib/auth";
import { excludeAuthors, getHiddenAuthorIds } from "@/lib/hiddenAuthors";

const users = { findOne: jest.fn() };
const mutedUsers = {
  createIndex: jest.fn().mockResolvedValue(undefined),
  updateOne: jest.fn().mockResolvedValue({}),
  deleteOne: jest.fn().mockResolvedValue({}),
  find: jest.fn(),
};
const blockedUsers = { find: jest.fn() };
const mockDb = { users: () => users, mutedUsers: () => mutedUsers, blockedUsers: () => blockedUsers };

jest.mock("@/lib/mongodb", () => ({
  MongoDBClient: jest.fn().mockImplementation(() => ({ init: jest.fn().mockResolvedValue(mockDb) })),
}));
jest.mock("@/lib/auth", () => ({ getSessionUserId: jest.fn() }));

const me = new ObjectId().toString();
const other = new ObjectId().toString();
const post = (body: unknown) =>
  new Request("http://x/api/mutes", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
const rows = (list: unknown[]) => ({ toArray: jest.fn().mockResolvedValue(list) });

beforeEach(() => {
  jest.clearAllMocks();
  (getSessionUserId as jest.Mock).mockResolvedValue(me);
  users.findOne.mockResolvedValue({ _id: new ObjectId(other) });
});

describe("/api/mutes", () => {
  it("needs a signed-in user", async () => {
    (getSessionUserId as jest.Mock).mockResolvedValue(null);
    expect((await POST(post({ userId: other }))).status).toBe(401);
    expect((await GET(new Request("http://x/api/mutes"))).status).toBe(401);
  });

  it("mutes another account once, however many times it is asked", async () => {
    const res = await POST(post({ userId: other }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, muted: true });
    expect(mutedUsers.updateOne).toHaveBeenCalledWith(
      { muterId: me, mutedId: other },
      expect.objectContaining({ $setOnInsert: expect.objectContaining({ muterId: me, mutedId: other }) }),
      { upsert: true }
    );
  });

  it("refuses to mute yourself, a bad id or someone who does not exist", async () => {
    expect((await POST(post({ userId: me }))).status).toBe(400);
    expect((await POST(post({ userId: "nope" }))).status).toBe(400);
    users.findOne.mockResolvedValue(null);
    expect((await POST(post({ userId: other }))).status).toBe(404);
    expect(mutedUsers.updateOne).not.toHaveBeenCalled();
  });

  it("unmutes", async () => {
    const res = await DELETE(new Request(`http://x/api/mutes?userId=${other}`, { method: "DELETE" }));
    expect(await res.json()).toEqual({ success: true, muted: false });
    expect(mutedUsers.deleteOne).toHaveBeenCalledWith({ muterId: me, mutedId: other });
  });
});

describe("/api/mutes?details=1", () => {
  const ada = new ObjectId();
  const bo = new ObjectId();
  const gone = new ObjectId().toString();

  it("lists the muted accounts, newest first, leaving out accounts that no longer exist", async () => {
    mutedUsers.find.mockReturnValue(
      rows([
        { mutedId: ada.toString(), createdAt: "2026-11-01T00:00:00.000Z" },
        { mutedId: bo.toString(), createdAt: "2026-11-20T00:00:00.000Z" },
        { mutedId: gone, createdAt: "2026-11-25T00:00:00.000Z" },
      ])
    );
    (mockDb as unknown as { users: () => unknown }).users = () => ({
      find: () => rows([
        { _id: ada, name: "Ada L", username: "ada", displayPicture: "a.png", verified: true },
        { _id: bo, firstname: "Bo", lastname: "Peep", username: "bo" },
      ]),
    });
    const res = await GET(new Request("http://x/api/mutes?details=1"));
    const body = await res.json();
    expect(body.users.map((u: { username: string }) => u.username)).toEqual(["bo", "ada"]);
    expect(body.users[0]).toMatchObject({ name: "Bo Peep", displayPicture: "", verified: false });
    expect(body.users[1]).toMatchObject({ name: "Ada L", verified: true });
    expect(body.mutedUserIds).toEqual([bo.toString(), ada.toString()]);
    (mockDb as unknown as { users: () => unknown }).users = () => users;
  });

  it("still answers with just the ids by default", async () => {
    mutedUsers.find.mockReturnValue(rows([{ mutedId: "a" }]));
    expect(await (await GET(new Request("http://x/api/mutes"))).json()).toEqual({ mutedUserIds: ["a"] });
  });
});

describe("hidden authors", () => {
  it("lists everyone the viewer blocked or muted, once each", async () => {
    blockedUsers.find.mockReturnValue(rows([{ blockedId: "a" }, { blockedId: "b" }]));
    mutedUsers.find.mockReturnValue(rows([{ mutedId: "b" }, { mutedId: "c" }]));
    const ids = await getHiddenAuthorIds(mockDb as never, me);
    expect([...ids].sort()).toEqual(["a", "b", "c"]);
    expect(blockedUsers.find).toHaveBeenCalledWith({ blockerId: me }, expect.anything());
    expect(mutedUsers.find).toHaveBeenCalledWith({ muterId: me }, expect.anything());
  });

  it("adds a $nin filter only when someone is hidden", () => {
    expect(excludeAuthors([])).toEqual({});
    expect(excludeAuthors(["a"])).toEqual({ UserId: { $nin: ["a"] } });
  });
});
