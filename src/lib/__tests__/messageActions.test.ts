import { canForward, canQuote, forwardBlockReason } from "../messageActions";

describe("forwarding", () => {
  it.each(["Call", "Poll", "PollResponse", "PollEnd", "PollResult", "Announcement"] as const)(
    "does not forward a %s message",
    (messageType) => {
      expect(canForward({ messageType, content: "x", status: "sent" })).toBe(false);
      expect(forwardBlockReason({ messageType, content: "x" })).toMatch(/can't be forwarded/);
    }
  );

  it.each(["Text", "Markdown", "Image", "Video", "Audio", "File", "VoiceNote", "Location", "Contact", "Sticker", "AnimatedGIF", "Link"] as const)(
    "forwards a %s message",
    (messageType) => {
      expect(canForward({ messageType, content: "x", status: "sent" })).toBe(true);
    }
  );

  it("does not forward deleted messages or ones that haven't reached the server", () => {
    expect(canForward({ messageType: "Text", content: "You deleted this message.≤≤≤" })).toBe(false);
    expect(canForward({ messageType: "Text", content: "hi", status: "sending" })).toBe(false);
    expect(canForward({ messageType: "Text", content: "hi", status: "failed" })).toBe(false);
    expect(forwardBlockReason({ messageType: "Text", content: "hi", status: "sending" })).toMatch(/sent/);
  });
});

describe("quoting", () => {
  it("quotes normal messages, calls and polls, but not announcements or deleted messages", () => {
    expect(canQuote({ messageType: "Text", content: "hi" })).toBe(true);
    expect(canQuote({ messageType: "Poll", content: "{}" })).toBe(true);
    expect(canQuote({ messageType: "Call", content: "{}" })).toBe(true);
    expect(canQuote({ messageType: "Announcement", content: "x" })).toBe(false);
    expect(canQuote({ messageType: "Text", content: "gone≤≤≤" })).toBe(false);
  });
});
