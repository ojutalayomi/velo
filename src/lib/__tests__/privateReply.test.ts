import {
  canReplyPrivately,
  findDmWith,
  privateReplyBlockReason,
  privateReplyQuote,
  privateReplyRoute,
} from "../privateReply";
import type { ConvoType } from "../types/type";

const me = "me";
const ada = "ada";
const groupMessage = { chatType: "Group", messageType: "Text" as const, content: "Who has the notes?", sender: { id: ada } };

const convo = (id: string, type: string, participants: string[]) => ({ id, type, participants }) as unknown as ConvoType;

describe("privateReplyBlockReason", () => {
  it("allows another member's group message", () => {
    expect(privateReplyBlockReason(groupMessage, me)).toBeNull();
    expect(canReplyPrivately(groupMessage, me)).toBe(true);
  });

  it("is only for group messages", () => {
    expect(privateReplyBlockReason({ ...groupMessage, chatType: "DM" }, me)).toMatch(/group message/);
  });

  it("is not for your own message", () => {
    expect(privateReplyBlockReason({ ...groupMessage, sender: { id: me } }, me)).toMatch(/own message/);
  });

  it("is not for a message with no sender, such as a system notice", () => {
    expect(canReplyPrivately({ ...groupMessage, sender: null }, me)).toBe(false);
    expect(canReplyPrivately({ ...groupMessage, sender: {} }, me)).toBe(false);
  });

  it("is not for announcements, deleted, view once or unsent messages", () => {
    expect(canReplyPrivately({ ...groupMessage, messageType: "Announcement" }, me)).toBe(false);
    expect(canReplyPrivately({ ...groupMessage, content: "This message was deleted.≤≤≤" }, me)).toBe(false);
    expect(canReplyPrivately({ ...groupMessage, viewOnce: true }, me)).toBe(false);
    expect(canReplyPrivately({ ...groupMessage, status: "sending" }, me)).toBe(false);
    expect(canReplyPrivately({ ...groupMessage, status: "failed" }, me)).toBe(false);
  });
});

describe("where a private reply goes", () => {
  const chats = [convo("g1", "Group", [me, ada, "bo"]), convo("dm1", "DM", [me, ada]), convo("dm2", "DM", [me, "cy"])];

  it("finds the DM with that person, never a group they are in", () => {
    expect(findDmWith(chats, me, ada)?.id).toBe("dm1");
    expect(findDmWith(chats, me, "bo")).toBeUndefined();
  });

  it("does not match somebody else's DM with that person", () => {
    expect(findDmWith([convo("dmX", "DM", ["zed", ada])], me, ada)).toBeUndefined();
  });

  it("opens the existing DM", () => {
    expect(privateReplyRoute(chats, me, ada)).toEqual({ route: "/chats/dm1", target: "dm1" });
  });

  it("opens the new-chat screen when there is no DM yet", () => {
    expect(privateReplyRoute(chats, me, "bo")).toEqual({ route: "/chats/new?otherId=bo", target: "new:bo" });
  });
});

describe("privateReplyQuote", () => {
  const messages = [{ _id: "m1", content: "Who has the notes?", messageType: "Text", sender: { id: ada } }];

  it("quotes the group message on the page it was meant for", () => {
    expect(privateReplyQuote({ messageId: "m1", target: "dm1" }, "dm1", messages)).toEqual({
      message: { _id: "m1", senderId: ada, content: "Who has the notes?" },
      state: true,
    });
  });

  it("does nothing on another page, with nothing pending, or when the message is gone", () => {
    expect(privateReplyQuote({ messageId: "m1", target: "dm1" }, "dm2", messages)).toBeNull();
    expect(privateReplyQuote(null, "dm1", messages)).toBeNull();
    expect(privateReplyQuote({ messageId: "nope", target: "dm1" }, "dm1", messages)).toBeNull();
  });
});
