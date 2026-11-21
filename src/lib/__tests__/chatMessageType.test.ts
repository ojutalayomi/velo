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
