/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { POST as markRead } from "@/app/api/notifications/read/route";
import { GET as getNotifications } from "@/app/api/notifications/route";
import { GET as getUnreadCountRoute } from "@/app/api/notifications/unread-count/route";
import { getSessionUserId } from "@/lib/auth";
import { getUnreadCount, listNotificationGroups, markAllRead } from "@/lib/notifications";

jest.mock("@/lib/auth", () => ({
  getSessionUserId: jest.fn(),
}));

jest.mock("@/lib/mongodb", () => ({
  MongoDBClient: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock("@/lib/notifications", () => ({
  ...jest.requireActual("@/lib/notifications"),
  listNotificationGroups: jest.fn(),
  markAllRead: jest.fn(),
  getUnreadCount: jest.fn(),
}));

const getSessionUserIdMock = getSessionUserId as jest.Mock;
const listMock = listNotificationGroups as jest.Mock;
const markAllReadMock = markAllRead as jest.Mock;
const getUnreadCountMock = getUnreadCount as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  getSessionUserIdMock.mockResolvedValue("user-1");
  listMock.mockResolvedValue({ data: [], hasMore: false, unreadCount: 0 });
  markAllReadMock.mockResolvedValue(1);
  getUnreadCountMock.mockResolvedValue(0);
});

describe("GET /api/notifications", () => {
  it("returns 401 without a session", async () => {
    getSessionUserIdMock.mockResolvedValue(null);
    const response = await getNotifications(
      new NextRequest("http://localhost/api/notifications")
    );
    expect(response.status).toBe(401);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("forwards tab and paging and returns the pagination envelope", async () => {
    const data = [{ groupKey: "like:post:p1" }];
    listMock.mockResolvedValue({ data, hasMore: true, unreadCount: 7 });

    const response = await getNotifications(
      new NextRequest("http://localhost/api/notifications?tab=mentions&skip=30&limit=5")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listMock).toHaveBeenCalledWith({}, "user-1", {
      tab: "mentions",
      skip: 30,
      limit: 5,
    });
    expect(body).toEqual({
      data,
      pagination: { skip: 30, limit: 5, hasMore: true },
      unreadCount: 7,
    });
  });

  it("falls back to the all tab and default paging", async () => {
    await getNotifications(
      new NextRequest("http://localhost/api/notifications?tab=unknown")
    );

    expect(listMock).toHaveBeenCalledWith({}, "user-1", {
      tab: "all",
      skip: 0,
      limit: 30,
    });
  });

  it("returns 500 when the query fails", async () => {
    listMock.mockRejectedValue(new Error("boom"));
    const response = await getNotifications(
      new NextRequest("http://localhost/api/notifications")
    );
    expect(response.status).toBe(500);
  });
});

describe("POST /api/notifications/read", () => {
  function request(body?: unknown): Request {
    return new Request("http://localhost/api/notifications/read", {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }

  it("returns 401 without a session", async () => {
    getSessionUserIdMock.mockResolvedValue(null);
    const response = await markRead(request({}));
    expect(response.status).toBe(401);
    expect(markAllReadMock).not.toHaveBeenCalled();
  });

  it("marks everything up to the requested instant read", async () => {
    getUnreadCountMock.mockResolvedValue(3);
    const before = "2026-01-02T08:00:00.000Z";

    const response = await markRead(request({ before }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, modified: 1, unreadCount: 3 });
    expect(markAllReadMock).toHaveBeenCalledWith(
      {},
      "user-1",
      new Date(before)
    );
  });

  it("clamps invalid or future cutoffs to now", async () => {
    await markRead(request({ before: "not-a-date" }));
    const invalid = markAllReadMock.mock.calls[0][2] as Date;
    expect(Number.isNaN(invalid.getTime())).toBe(false);

    markAllReadMock.mockClear();
    await markRead(request({ before: new Date(Date.now() + 60_000).toISOString() }));
    const future = markAllReadMock.mock.calls[0][2] as Date;
    expect(future.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("treats a missing body as now", async () => {
    await markRead(request());
    expect(markAllReadMock.mock.calls[0][2]).toBeInstanceOf(Date);
  });
});

describe("GET /api/notifications/unread-count", () => {
  it("returns 401 without a session", async () => {
    getSessionUserIdMock.mockResolvedValue(null);
    const response = await getUnreadCountRoute();
    expect(response.status).toBe(401);
  });

  it("returns the unread count", async () => {
    getUnreadCountMock.mockResolvedValue(12);
    const response = await getUnreadCountRoute();
    expect(await response.json()).toEqual({ unreadCount: 12 });
  });

  it("returns 500 when the count fails", async () => {
    getUnreadCountMock.mockRejectedValue(new Error("boom"));
    const response = await getUnreadCountRoute();
    expect(response.status).toBe(500);
  });
});
