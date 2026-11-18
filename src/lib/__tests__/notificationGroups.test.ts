import {
  formatNotificationText,
  matchesNotificationTab,
  mergeNotificationGroup,
  notificationAction,
  removeActorFromGroups,
} from "@/lib/notificationGroups";
import type { NotificationActor, NotificationGroup } from "@/lib/types/type";

const alex: NotificationActor = {
  id: "1",
  name: "Alex Johnson",
  username: "alex",
  displayPicture: "",
  verified: true,
};

const sam: NotificationActor = {
  id: "2",
  name: "Sam Lee",
  username: "sam",
  displayPicture: "",
  verified: false,
};

const rio: NotificationActor = {
  id: "3",
  name: "Rio Park",
  username: "rio",
  displayPicture: "",
  verified: false,
};

function group(overrides: Partial<NotificationGroup> = {}): NotificationGroup {
  return {
    groupKey: "like:post:p1",
    type: "like",
    targetType: "post",
    targetId: "p1",
    url: "/alex/posts/p1",
    latestAt: "2026-01-01T00:00:00.000Z",
    count: 1,
    actorCount: 1,
    unread: true,
    actors: [alex],
    ...overrides,
  };
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    notification: {
      groupKey: "like:post:p1",
      type: "like" as const,
      targetType: "post" as const,
      targetId: "p1",
      url: "/alex/posts/p1",
      createdAt: "2026-01-02T00:00:00.000Z",
      actor: sam,
      ...overrides,
    },
  };
}

describe("notification text", () => {
  it("describes each action and target", () => {
    expect(notificationAction({ type: "like", targetType: "post" })).toBe("liked your post");
    expect(notificationAction({ type: "like", targetType: "comment" })).toBe(
      "liked your comment"
    );
    expect(notificationAction({ type: "comment", targetType: "post" })).toBe(
      "commented on your post"
    );
    expect(notificationAction({ type: "comment", targetType: "comment" })).toBe(
      "replied to your comment"
    );
    expect(notificationAction({ type: "follow", targetType: "user" })).toBe(
      "started following you"
    );
    expect(notificationAction({ type: "mention", targetType: "post" })).toBe(
      "mentioned you in a post"
    );
    expect(notificationAction({ type: "mention", targetType: "chat_message" })).toBe(
      "mentioned you in a chat"
    );
  });

  it("joins up to three names and summarises the rest", () => {
    expect(formatNotificationText(group())).toBe("Alex Johnson liked your post");
    expect(formatNotificationText(group({ actors: [alex, sam], actorCount: 2 }))).toBe(
      "Alex Johnson and Sam Lee liked your post"
    );
    expect(
      formatNotificationText(group({ actors: [alex, sam, rio], actorCount: 5 }))
    ).toBe("Alex Johnson, Sam Lee, Rio Park and 2 others liked your post");
  });
});

describe("tab matching", () => {
  it("filters mentions and verified actors", () => {
    expect(matchesNotificationTab({ type: "like", verified: false }, "all")).toBe(true);
    expect(matchesNotificationTab({ type: "mention", verified: false }, "mentions")).toBe(true);
    expect(matchesNotificationTab({ type: "like", verified: false }, "mentions")).toBe(false);
    expect(matchesNotificationTab({ type: "like", verified: true }, "verified")).toBe(true);
    expect(matchesNotificationTab({ type: "like", verified: false }, "verified")).toBe(false);
  });
});

describe("live merging", () => {
  it("prepends a new group", () => {
    const merged = mergeNotificationGroup([], event());
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      groupKey: "like:post:p1",
      count: 1,
      actorCount: 1,
      unread: true,
      latestAt: "2026-01-02T00:00:00.000Z",
      actors: [sam],
    });
  });

  it("merges actors into an existing group and moves it to the top", () => {
    const other = group({ groupKey: "follow:user:9", type: "follow", targetType: "user" });
    const merged = mergeNotificationGroup([other, group()], event());

    expect(merged[0].groupKey).toBe("like:post:p1");
    expect(merged[0].count).toBe(2);
    expect(merged[0].actorCount).toBe(2);
    expect(merged[0].actors.map((actor) => actor.id)).toEqual(["1", "2"]);
    expect(merged[1].groupKey).toBe("follow:user:9");
  });

  it("does not double-count a repeated actor", () => {
    const merged = mergeNotificationGroup([group()], event({ actor: alex }));
    expect(merged[0].count).toBe(2);
    expect(merged[0].actorCount).toBe(1);
    expect(merged[0].actors).toHaveLength(1);
  });
});

describe("live removal", () => {
  it("drops the actor and decrements the count", () => {
    const merged = removeActorFromGroups(
      [group({ actors: [alex, sam], actorCount: 2, count: 2 })],
      { groupKey: "like:post:p1", actorId: "2" }
    );

    expect(merged[0].count).toBe(1);
    expect(merged[0].actorCount).toBe(1);
    expect(merged[0].actors.map((actor) => actor.id)).toEqual(["1"]);
  });

  it("removes the group when the last actor leaves", () => {
    const merged = removeActorFromGroups([group()], {
      groupKey: "like:post:p1",
      actorId: "1",
    });
    expect(merged).toEqual([]);
  });

  it("ignores unknown groups", () => {
    const groups = [group()];
    expect(
      removeActorFromGroups(groups, { groupKey: "missing", actorId: "1" })
    ).toBe(groups);
  });
});
