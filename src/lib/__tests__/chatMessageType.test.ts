import { callCardLabel, parseCallRecord } from "@/lib/callRecord";
import { messageText } from "@/lib/polls";
import { ChatMessage } from "@/lib/class/ChatMessage";
import type { MessageAttributes } from "@/lib/types/type";

const base = {
  _id: "1",
  chatId: "c",
  receiverId: "r",
  timestamp: new Date().toISOString(),
  isRead: {},
  sender: { id: "u", name: "U", displayPicture: "", username: "u", verified: false },
  reactions: [],
  attachments: [],
  quotedMessageId: "",
  status: "sending",
  chatType: "DM",
  mentions: [],
} as unknown as MessageAttributes;

describe("call history cards", () => {
  const content = JSON.stringify({ callType: "audio", outcome: "missed", durationSec: 0, participants: 1, callerId: "a" });

  it("keeps the Call type and previews it as text", () => {
    const msg = new ChatMessage({ ...base, content, messageType: "Call" });
    expect(msg.messageType).toBe("Call");
    expect(messageText(msg)).toBe("📞 Missed voice call");
  });

  it("words the card for the caller and the person who was called", () => {
    const record = parseCallRecord(content)!;
    expect(callCardLabel(record, "a", false)).toMatchObject({ title: "Voice call", detail: "No answer" });
    expect(callCardLabel(record, "b", false)).toMatchObject({ title: "Missed voice call", tone: "bad" });
    const done = { ...record, outcome: "completed" as const, durationSec: 75, participants: 3 };
    expect(callCardLabel(done, "b", true)).toMatchObject({ title: "Group voice call", detail: "1m 15s · 3 people", tone: "ok" });
  });
});

describe("ChatMessage message type", () => {
  it("keeps an explicit Poll type even though the content is JSON", () => {
    const msg = new ChatMessage({
      ...base,
      content: JSON.stringify({ question: "Q", options: ["a", "b"], multiple: false }),
      messageType: "Poll",
    });
    expect(msg.messageType).toBe("Poll");
  });

  it("still infers types for ordinary messages", () => {
    expect(new ChatMessage({ ...base, content: "hello", messageType: "Markdown" }).messageType).toBe(
      "Markdown"
    );
    expect(
      new ChatMessage({ ...base, content: "https://example.com", messageType: "Markdown" }).messageType
    ).toBe("Link");
  });
});
