/**
 * @jest-environment node
 */
import { statusForwardBlockReason, statusTextFrom } from "@/lib/statusForward";
import { statusPayloadFor } from "@/lib/statusForwardServer";

describe("statusForwardBlockReason", () => {
  it("allows text, photo, video and voice", () => {
    expect(statusForwardBlockReason({ messageType: "Text", content: "hi", attachmentCount: 0 })).toBeNull();
    for (const messageType of ["Image", "Video", "VoiceNote"]) {
      expect(statusForwardBlockReason({ messageType, content: "", attachmentCount: 1 })).toBeNull();
    }
  });

  it("refuses everything that only belongs in its chat", () => {
    for (const messageType of ["Call", "Poll", "Contact", "Location", "File", "Sticker", "Link"]) {
      expect(statusForwardBlockReason({ messageType, content: "x", attachmentCount: 1 })).toMatch(/Only text/);
    }
  });

  it("refuses deleted, view once and empty messages", () => {
    expect(statusForwardBlockReason({ messageType: "Text", content: "gone≤≤≤", attachmentCount: 0 })).toMatch(/Deleted/);
    expect(statusForwardBlockReason({ messageType: "Image", attachmentCount: 1, viewOnce: true })).toMatch(/View once/);
    expect(statusForwardBlockReason({ messageType: "Text", content: "  ", attachmentCount: 0 })).toMatch(/nothing/);
    expect(statusForwardBlockReason({ messageType: "Image", content: "", attachmentCount: 0 })).toMatch(/nothing/);
  });
});

describe("statusPayloadFor", () => {
  it("makes a text status with the default background, trimmed to the limit", () => {
    expect(statusPayloadFor({ messageType: "Text", content: "  hello " }, null)).toEqual({
      mediaType: "text",
      text: "hello",
      background: "brand",
    });
    expect(statusTextFrom("a".repeat(900))).toHaveLength(500);
  });

  it("reads a voice note's length from its file name", () => {
    expect(statusPayloadFor({ messageType: "VoiceNote", content: "" }, { name: "voice-note-1700000000000-42s.mp3" })).toEqual({
      mediaType: "audio",
      durationSec: 42,
    });
  });

  it("needs the stored file for media", () => {
    expect(statusPayloadFor({ messageType: "Image", content: "" }, null)).toBeNull();
    expect(statusPayloadFor({ messageType: "Video", content: "" }, { name: "a.mp4" })).toEqual({ mediaType: "video" });
  });
});
