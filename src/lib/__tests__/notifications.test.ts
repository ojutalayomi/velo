/**
 * @jest-environment node
 */
import { MongoDBClient } from "@/lib/mongodb";
import {
  buildNotificationMatch,
  listNotificationGroups,
  markAllRead,
  parseNotificationTab,
  toNotificationGroup,
} from "@/lib/notifications";
import type { InAppNotificationSchema, NotificationActor } from "@/lib/types/type";

const alex: NotificationActor = {
  id: "a1",
  name: "Alex Johnson",
  username: "alex",
  displayPicture: "",
  verified: true,
};

function rawNotification(overrides: Partial<InAppNotificationSchema>): InAppNotificationSchema {
  return {
    userId: "user-1",
    actorId: "a1",
    actor: alex,
    type: "like",
    targetType: "post",
    targetId: "p1",
    groupKey: "like:post:p1",
    dedupeKey: "like:post:p1:user-1:a1",
    url: "/alex/posts/p1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    readAt: null,
    ...overrides,
  } as InAppNotificationSchema;
}

function makeDb(options: { rows?: unknown[]; unreadCount?: number; blocked?: string[] } = {}) {
  const pipelines: unknown[][] = [];
  const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 2 });
  const blocked = options.blocked ?? [];

  const db = {
    blockedUsers: () => ({
      find: () => ({
        toArray: async () => blocked.map((blockedId) => ({ blockedId })),
      }),
    }),
    notifications: () => ({
      aggregate: (pipeline: unknown[]) => {
        pipelines.push(pipeline);
        return { toArray: async () => options.rows ?? [] };
      },
      countDocuments: async () => options.unreadCount ?? 0,
      updateMany,
    }),
  } as unknown as MongoDBClient;

  return { db, pipelines, updateMany };
}

describe("parseNotificationTab", () => {
  it("accepts known tabs and falls back to all", () => {
    expect(parseNotificationTab("all")).toBe("all");
    expect(parseNotificationTab("mentions")).toBe("mentions");
    expect(parseNotificationTab("verified")).toBe("verified");
    expect(parseNotificationTab("nope")).toBe("all");
    expect(parseNotificationTab(null)).toBe("all");
  });
});

describe("buildNotificationMatch", () => {
  it("scopes by user and excludes blocked actors", () => {
    expect(buildNotificationMatch("user-1", "all", ["a2"])).toEqual({
      userId: "user-1",
      actorId: { $nin: ["a2"] },
    });
  });

  it("adds type and verification filters", () => {
    expect(buildNotificationMatch("user-1", "mentions", [])).toEqual({
      userId: "user-1",
      type: "mention",
    });
    expect(buildNotificationMatch("user-1", "verified", [])).toEqual({
      userId: "user-1",
      "actor.verified": true,
    });
  });
});

describe("toNotificationGroup", () => {
  it("dedupes actors, caps them at three and normalises fields", () => {
    const group = toNotificationGroup({
      _id: "like:post:p1",
      latest: rawNotification({}),
      actors: [alex, alex, { ...alex, id: "a2" }, { ...alex, id: "a3" }, { ...alex, id: "a4" }],
      count: 5,
      unread: 1,
    });

    expect(group.groupKey).toBe("like:post:p1");
    expect(group.latestAt).toBe("2026-01-01T00:00:00.000Z");
    expect(group.unread).toBe(true);
    expect(group.actorCount).toBe(4);
    expect(group.actors.map((actor) => actor.id)).toEqual(["a1", "a2", "a3"]);
  });
});

describe("listNotificationGroups", () => {
  it("paginates grouped rows and reports whether more exist", async () => {
    const rows = [
      { _id: "like:post:p1", latest: rawNotification({}), actors: [alex], count: 1, unread: 1 },
      { _id: "follow:user:a1", latest: rawNotification({ type: "follow" }), actors: [alex], count: 1, unread: 0 },
      { _id: "mention:post:p2", latest: rawNotification({ type: "mention" }), actors: [alex], count: 1, unread: 0 },
    ];
    const { db, pipelines } = makeDb({ rows, unreadCount: 3, blocked: ["a2"] });

    const result = await listNotificationGroups(db, "user-1", {
      tab: "verified",
      skip: 30,
      limit: 2,
    });

    expect(result.hasMore).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.unreadCount).toBe(3);

    const pipeline = pipelines[0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({
      $match: { userId: "user-1", "actor.verified": true, actorId: { $nin: ["a2"] } },
    });
    expect(pipeline).toEqual(
      expect.arrayContaining([
        { $sort: { createdAt: -1, _id: -1 } },
        { $skip: 30 },
        { $limit: 3 },
        { $sort: { "latest.createdAt": -1 } },
      ])
    );
    expect(pipeline[2]).toMatchObject({
      $group: {
        _id: "$groupKey",
        latest: { $first: "$$ROOT" },
        actors: { $push: "$actor" },
        count: { $sum: 1 },
      },
    });
  });
});

describe("markAllRead", () => {
  it("only updates unread rows created before the cutoff", async () => {
    const { db, updateMany } = makeDb();
    const before = new Date("2026-01-02T00:00:00.000Z");

    const modified = await markAllRead(db, "user-1", before);

    expect(modified).toBe(2);
    expect(updateMany).toHaveBeenCalledWith(
      { userId: "user-1", readAt: null, createdAt: { $lte: before } },
      { $set: { readAt: expect.any(Date) } }
    );
  });
});
