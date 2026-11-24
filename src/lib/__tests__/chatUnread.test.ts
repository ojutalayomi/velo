import { unreadAfterMessage } from "@/lib/chatUnread";

const msg = (senderId: string, isRead?: Record<string, boolean>) => ({ sender: { id: senderId }, isRead });

describe("unreadAfterMessage", () => {
  it("does not count a message I sent, even when it is flagged unread for me", () => {
    expect(unreadAfterMessage(0, msg("me", { me: false, other: true }), "me")).toBe(0);
    expect(unreadAfterMessage(3, msg("me"), "me")).toBe(3);
  });

  it("counts someone else's message", () => {
    expect(unreadAfterMessage(0, msg("other", { me: false }), "me")).toBe(1);
    expect(unreadAfterMessage(2, msg("other"), "me")).toBe(3);
  });

  it("does not count a message already read by me", () => {
    expect(unreadAfterMessage(2, msg("other", { me: true }), "me")).toBe(2);
  });

  it("starts from zero when the chat has no count yet", () => {
    expect(unreadAfterMessage(undefined, msg("other"), "me")).toBe(1);
    expect(unreadAfterMessage(undefined, msg("me"), "me")).toBe(0);
  });

  it("compares ids as strings and leaves the count alone when I am unknown", () => {
    expect(unreadAfterMessage(1, { sender: { id: 5 as never } }, "5")).toBe(1);
    expect(unreadAfterMessage(1, msg("other"), undefined)).toBe(1);
  });
});
