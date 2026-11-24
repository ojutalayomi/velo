import { chatPageUrls, OFFLINE_CHAT_PAGES, pagesToSave } from "@/lib/offlinePages";

const chat = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, type: "Direct", pinned: false, archived: false, timestamp: "2026-01-01T00:00:00.000Z", ...extra }) as never;

describe("chatPageUrls", () => {
  it("gives a chat page and its settings page", () => {
    expect(chatPageUrls({ id: "a", type: "Direct" })).toEqual(["/chats/a", "/chats/a/settings"]);
  });

  it("uses the group paths for groups", () => {
    expect(chatPageUrls({ id: "g", type: "Group" })).toEqual(["/chats/group/g", "/chats/group/g/settings"]);
  });

  it("has no settings page for 'message yourself'", () => {
    expect(chatPageUrls({ id: "me1", type: "Personal" })).toEqual(["/chats/me"]);
  });

  it("ignores a chat without an id", () => {
    expect(chatPageUrls({ id: "", type: "Direct" })).toEqual([]);
  });
});

describe("pagesToSave", () => {
  it("covers at least 20 chats when there are that many", () => {
    const chats = Array.from({ length: 25 }, (_, i) => chat(`c${i}`));
    expect(OFFLINE_CHAT_PAGES).toBeGreaterThanOrEqual(20);
    expect(pagesToSave(chats).length).toBe(25 * 2);
  });

  it("caps the number of chats, keeping the newest", () => {
    const chats = Array.from({ length: 50 }, (_, i) =>
      chat(`c${i}`, { timestamp: new Date(2026, 0, 1 + i).toISOString() })
    );
    const urls = pagesToSave(chats, 3);
    expect(urls).toEqual([
      "/chats/c49", "/chats/c49/settings",
      "/chats/c48", "/chats/c48/settings",
      "/chats/c47", "/chats/c47/settings",
    ]);
  });

  it("puts pinned chats first and archived chats last", () => {
    const urls = pagesToSave(
      [
        chat("archived", { archived: true, timestamp: "2026-06-01T00:00:00.000Z" }),
        chat("new", { timestamp: "2026-05-01T00:00:00.000Z" }),
        chat("pinned", { pinned: true, timestamp: "2026-01-01T00:00:00.000Z" }),
      ],
      3
    );
    expect(urls.filter((u) => !u.endsWith("/settings"))).toEqual(["/chats/pinned", "/chats/new", "/chats/archived"]);
  });

  it("tolerates an empty or missing list and bad timestamps", () => {
    expect(pagesToSave([])).toEqual([]);
    expect(pagesToSave(undefined as never)).toEqual([]);
    expect(pagesToSave([chat("a", { timestamp: "nope" })])).toEqual(["/chats/a", "/chats/a/settings"]);
  });
});
