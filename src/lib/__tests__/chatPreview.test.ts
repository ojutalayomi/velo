import { convoPreviewUpdate, isSystemPreview, plainPreview, previewFor } from "@/lib/chatPreview";
import { formatChatTime } from "@/lib/chatTime";

describe("plainPreview", () => {
  it("drops code fences, language tags and markdown markers", () => {
    expect(plainPreview("```json\n{ \"a\": 1 }\n```")).toBe('{ "a": 1 }');
    expect(plainPreview("**bold** and `code` and [a link](https://x.com)")).toBe("bold and code and a link");
    expect(plainPreview("# Title\n- one\n- two")).toBe("Title one two");
  });
});

describe("previewFor", () => {
  it("shows a link on its own as its site", () => {
    expect(previewFor({ messageType: "Link", content: "https://www.example.com/a/b" })).toBe("🔗 example.com");
    expect(previewFor({ messageType: "Text", content: "https://example.com/x" })).toBe("🔗 example.com");
  });

  it("cleans markdown messages but leaves plain text alone", () => {
    expect(previewFor({ messageType: "Markdown", content: "**hi** there" })).toBe("hi there");
    expect(previewFor({ messageType: "Text", content: "**hi** there" })).toBe("**hi** there");
  });

  it("labels attachment-only and structured messages", () => {
    expect(previewFor({ messageType: "VoiceNote", content: "", attachments: [{}] })).toBe("🎤 Voice message");
    expect(previewFor({ messageType: "Image", content: "", attachments: [{}] })).toBe("📷 Photo");
    expect(previewFor({ messageType: "AnimatedGIF", content: "{}" })).toBe("🎞 GIF");
  });

  it("shows a deleted message without its marker", () => {
    expect(previewFor({ messageType: "Text", content: "You deleted this message.≤≤≤" })).toBe(
      "You deleted this message"
    );
  });
});

describe("convoPreviewUpdate", () => {
  it("records who sent the latest message", () => {
    expect(
      convoPreviewUpdate({ _id: "m1", content: "hi", messageType: "Text", sender: { id: "u1", name: "Ada" } })
    ).toEqual({ lastMessage: "hi", lastMessageId: "m1", lastSenderId: "u1", lastSenderName: "Ada", lastRead: false });
  });
});

describe("isSystemPreview", () => {
  it("does not prefix placeholders with a name", () => {
    expect(isSystemPreview("🚫 Message not found")).toBe(true);
    expect(isSystemPreview("This message was deleted")).toBe(true);
    expect(isSystemPreview("hello")).toBe(false);
  });
});

describe("formatChatTime", () => {
  const now = new Date(2026, 10, 22, 15, 0); // Sun 22 Nov 2026
  it("uses the clock for today", () => {
    expect(formatChatTime(new Date(2026, 10, 22, 9, 50), now)).toBe("9:50 AM");
  });
  it("says Yesterday, then the weekday for the last week", () => {
    expect(formatChatTime(new Date(2026, 10, 21, 23, 0), now)).toBe("Yesterday");
    expect(formatChatTime(new Date(2026, 10, 18, 8, 0), now)).toBe("Wednesday");
  });
  it("uses a short date after that, with the year only when it differs", () => {
    expect(formatChatTime(new Date(2026, 10, 14, 8, 0), now)).toBe("Nov 14");
    expect(formatChatTime(new Date(2025, 9, 18, 8, 0), now)).toBe("Oct 18, 2025");
  });
});
