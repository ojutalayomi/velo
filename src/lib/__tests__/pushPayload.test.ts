/**
 * @jest-environment node
 */
import {
  normalizePayload,
  normalizeText,
  sanitizeTag,
  sanitizeUrl,
} from "@/lib/push";

describe("push payload normalization", () => {
  it("strips HTML, control characters, and collapses whitespace", () => {
    expect(normalizeText("<b>Hello</b>\n\n  world\u0000", 100)).toBe("Hello world");
  });

  it("truncates to the requested length", () => {
    expect(normalizeText("abcdef", 4)).toBe("abcd");
  });

  it("only allows same-origin absolute paths", () => {
    expect(sanitizeUrl("/chats/group/abc?x=1")).toBe("/chats/group/abc?x=1");
    expect(sanitizeUrl("https://evil.example")).toBe("/notifications");
    expect(sanitizeUrl("//evil.example/path")).toBe("/notifications");
    expect(sanitizeUrl("/chats\\..\\evil")).toBe("/notifications");
    expect(sanitizeUrl(42)).toBe("/notifications");
  });

  it("validates collapse tags", () => {
    expect(sanitizeTag("chat:abc-123_x")).toBe("chat:abc-123_x");
    expect(sanitizeTag("bad tag!")).toBeUndefined();
    expect(sanitizeTag("")).toBeUndefined();
    expect(sanitizeTag("x".repeat(129))).toBeUndefined();
  });

  it("applies defaults, truncation, and removes data.url", () => {
    const payload = normalizePayload({
      title: "<i>Title</i>",
      body: "x".repeat(500),
      data: { url: "https://evil.example", key: "value" },
    });

    expect(payload.title).toBe("Title");
    expect(payload.body).toHaveLength(240);
    expect(payload.url).toBe("/notifications");
    expect(payload.icon).toBe("/notifications.png");
    expect(payload.badge).toBe("/badge.png");
    expect(payload.data).toEqual({ key: "value" });
  });

  it("defaults a missing title to Velo", () => {
    expect(normalizePayload({ title: "", body: "hi" }).title).toBe("Velo");
  });

  it("keeps close payloads empty and marks the action", () => {
    const payload = normalizePayload({
      title: "should be dropped",
      body: "should be dropped",
      tag: "call:abc",
      action: "close",
    });

    expect(payload).toMatchObject({
      title: "",
      body: "",
      tag: "call:abc",
      action: "close",
    });
  });

  it("drops oversized data before shrinking the body", () => {
    const payload = normalizePayload({
      title: "Title",
      body: "Body",
      data: { blob: "x".repeat(5000) },
    });

    expect(payload.data).toBeUndefined();
    expect(payload.body).toBe("Body");
    expect(Buffer.byteLength(JSON.stringify(payload), "utf8")).toBeLessThanOrEqual(3500);
  });

  it("never exceeds the serialized size cap", () => {
    const payload = normalizePayload({
      title: "t".repeat(200),
      body: "b".repeat(5000),
      data: { blob: "x".repeat(5000) },
      tag: "chat:abc",
    });

    expect(Buffer.byteLength(JSON.stringify(payload), "utf8")).toBeLessThanOrEqual(3500);
  });
});
