import { deriveMessageType } from "@/lib/messageType";

const file = (type: string, name = "f") => ({ type, name });

describe("deriveMessageType", () => {
  it("makes a URL-only message a Link, but not a URL inside a sentence", () => {
    expect(deriveMessageType({ content: "https://velo.app/x?y=1" })).toBe("Link");
    expect(deriveMessageType({ content: "  https://velo.app  " })).toBe("Link");
    expect(deriveMessageType({ content: "see https://velo.app" })).toBe("Text");
    expect(deriveMessageType({ content: "https://a.com https://b.com" })).toBe("Text");
  });

  it("defaults to Text and only uses Markdown when asked", () => {
    expect(deriveMessageType({ content: "hi" })).toBe("Text");
    expect(deriveMessageType({ content: "**hi**", requested: "Markdown" })).toBe("Markdown");
    expect(deriveMessageType({ content: "hi", requested: "Link" })).toBe("Text");
  });

  it("types attachment-only messages by their kind", () => {
    expect(deriveMessageType({ attachments: [file("image/png"), file("image/jpeg")] })).toBe("Image");
    expect(deriveMessageType({ attachments: [file("video/mp4")] })).toBe("Video");
    expect(deriveMessageType({ attachments: [file("audio/mpeg", "song.mp3")] })).toBe("Audio");
    expect(deriveMessageType({ attachments: [file("application/pdf")] })).toBe("File");
    expect(deriveMessageType({ attachments: [file("image/png"), file("application/pdf")] })).toBe("File");
  });

  it("recognises a recorded voice note, but not an ordinary audio file", () => {
    expect(deriveMessageType({ attachments: [file("audio/mpeg", "voice-note-1-5s.mp3")] })).toBe("VoiceNote");
    expect(
      deriveMessageType({ attachments: [file("audio/mpeg", "voice-note-1-5s.mp3"), file("audio/mpeg", "b.mp3")] })
    ).toBe("Audio");
  });

  it("keeps the text type when files come with a caption", () => {
    expect(deriveMessageType({ content: "look", attachments: [file("image/png")], requested: "Markdown" })).toBe("Markdown");
    expect(deriveMessageType({ content: "look", attachments: [file("image/png")] })).toBe("Text");
  });

  it("keeps structured types as requested", () => {
    expect(deriveMessageType({ content: "{}", requested: "Poll" })).toBe("Poll");
    expect(deriveMessageType({ content: "{}", requested: "Location" })).toBe("Location");
  });
});
