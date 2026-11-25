/**
 * @jest-environment node
 */
import { ObjectId } from "mongodb";

import { groupStatusRows, isStatusFileUrl, normalizeStatusBatch } from "@/lib/statusServer";

jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("@/lib/auth", () => ({ verifyToken: jest.fn() }));
jest.mock("@/lib/mongodb", () => ({ MongoDBClient: jest.fn() }));

const FILE = "https://post-s.s3.us-east-1.amazonaws.com/2026/11/25/clip.png-7";

describe("isStatusFileUrl", () => {
  it("accepts our buckets over https and nothing else", () => {
    expect(isStatusFileUrl(FILE)).toBe(true);
    expect(isStatusFileUrl("https://post-s.s3.amazonaws.com/a.png")).toBe(true);
    expect(isStatusFileUrl("https://files-for-chat.s3.amazonaws.com/a.mp3")).toBe(true);
    expect(isStatusFileUrl("http://post-s.s3.amazonaws.com/a.png")).toBe(false);
    expect(isStatusFileUrl("https://evil.example.com/post-s.s3.amazonaws.com/a.png")).toBe(false);
    expect(isStatusFileUrl("https://post-s.s3.amazonaws.com.evil.com/a.png")).toBe(false);
    expect(isStatusFileUrl("https://other-bucket.s3.amazonaws.com/a.png")).toBe(false);
    expect(isStatusFileUrl("not a url")).toBe(false);
  });
});

describe("normalizeStatusBatch", () => {
  it("still takes photos and videos, in a batch or on their own", () => {
    const one = normalizeStatusBatch({ mediaType: "image", mediaUrl: FILE, mediaKey: "k", caption: " hi " });
    expect(one?.items).toHaveLength(1);
    expect(one?.caption).toBe("hi");
    const many = normalizeStatusBatch({
      items: [
        { mediaType: "image", mediaUrl: FILE, mediaKey: "a" },
        { mediaType: "video", mediaUrl: FILE, mediaKey: "b" },
      ],
    });
    expect(many?.items.map((i) => i.mediaType)).toEqual(["image", "video"]);
  });

  it("takes a text status with a known background, and no caption", () => {
    const result = normalizeStatusBatch({ mediaType: "text", text: "  Hello  ", background: "ocean", caption: "x" });
    expect(result?.items[0]).toMatchObject({ mediaType: "text", text: "Hello", background: "ocean", mediaUrl: "", mediaKey: "" });
    expect(result?.caption).toBe("");
  });

  it("rejects an empty text, an unknown background, or too many characters being kept", () => {
    expect(normalizeStatusBatch({ mediaType: "text", text: "   ", background: "ocean" })).toBeNull();
    expect(normalizeStatusBatch({ mediaType: "text", text: "hi", background: "nope" })).toBeNull();
    expect(normalizeStatusBatch({ mediaType: "text", text: "hi" })).toBeNull();
    const long = normalizeStatusBatch({ mediaType: "text", text: "a".repeat(900), background: "brand" });
    expect(long?.items[0].text).toHaveLength(500);
  });

  it("takes a voice status with its length, and a caption", () => {
    const result = normalizeStatusBatch({
      mediaType: "audio",
      mediaUrl: FILE,
      mediaKey: "voice",
      durationSec: 12.4,
      caption: "listen",
    });
    expect(result?.items[0]).toMatchObject({ mediaType: "audio", durationSec: 12 });
    expect(result?.caption).toBe("listen");
  });

  it("rejects a voice status without a sensible length or with a foreign file", () => {
    const base = { mediaType: "audio", mediaUrl: FILE, mediaKey: "voice" };
    expect(normalizeStatusBatch({ ...base })).toBeNull();
    expect(normalizeStatusBatch({ ...base, durationSec: 0 })).toBeNull();
    expect(normalizeStatusBatch({ ...base, durationSec: 301 })).toBeNull();
    expect(normalizeStatusBatch({ ...base, durationSec: 20, mediaUrl: "https://evil.example.com/a.mp3" })).toBeNull();
  });

  it("keeps text and voice statuses on their own", () => {
    expect(
      normalizeStatusBatch({
        items: [
          { mediaType: "image", mediaUrl: FILE, mediaKey: "a" },
          { mediaType: "text", text: "hi", background: "brand" },
        ],
      })
    ).toBeNull();
    expect(
      normalizeStatusBatch({
        items: [
          { mediaType: "audio", mediaUrl: FILE, mediaKey: "a", durationSec: 5 },
          { mediaType: "audio", mediaUrl: FILE, mediaKey: "b", durationSec: 5 },
        ],
      })
    ).toBeNull();
  });

  it("rejects unknown types and missing files", () => {
    expect(normalizeStatusBatch({ mediaType: "gif", mediaUrl: FILE, mediaKey: "k" })).toBeNull();
    expect(normalizeStatusBatch({ mediaType: "image", mediaUrl: FILE })).toBeNull();
    expect(normalizeStatusBatch({ items: [] })).toBeNull();
    expect(normalizeStatusBatch(null)).toBeNull();
  });
});

describe("groupStatusRows", () => {
  const ownerId = new ObjectId().toString();
  const me = new ObjectId().toString();
  const other = new ObjectId().toString();
  const row = {
    _id: new ObjectId(),
    userId: ownerId,
    mediaType: "text",
    mediaUrl: "",
    mediaKey: "",
    text: "hello",
    background: "ocean",
    caption: "",
    createdAt: "2026-11-25T10:00:00.000Z",
    expiresAt: "2026-11-26T10:00:00.000Z",
    visibility: "followers",
    owner: { _id: new ObjectId(ownerId), name: "Ada", username: "ada" },
    viewers: [
      { viewerId: me, viewedAt: "2026-11-25T11:00:00.000Z" },
      { viewerId: other, viewedAt: "2026-11-25T12:00:00.000Z" },
    ],
    likes: [{ userId: me }],
  } as unknown as Parameters<typeof groupStatusRows>[0][number];

  it("gives the owner the viewer list, and everyone else only the count", () => {
    const [asOwner] = groupStatusRows([row], ownerId);
    expect(asOwner.statuses[0].viewers).toHaveLength(2);
    expect(asOwner.statuses[0].viewCount).toBe(2);

    const [asViewer] = groupStatusRows([row], me);
    expect(asViewer.statuses[0].viewers).toEqual([]);
    expect(asViewer.statuses[0].viewCount).toBe(2);
  });

  it("reports likes and whether the viewer liked it, plus the text fields", () => {
    const [asViewer] = groupStatusRows([row], me);
    expect(asViewer.statuses[0]).toMatchObject({
      likeCount: 1,
      liked: true,
      viewed: true,
      text: "hello",
      background: "ocean",
    });
    const [asOther] = groupStatusRows([row], other);
    expect(asOther.statuses[0].liked).toBe(false);
  });

  it("is unviewed, with no likes, for someone who has not opened it", () => {
    const [group] = groupStatusRows([{ ...row, viewers: [], likes: [] }], me);
    expect(group.hasUnviewed).toBe(true);
    expect(group.statuses[0]).toMatchObject({ viewCount: 0, likeCount: 0, liked: false, viewed: false });
  });
});
