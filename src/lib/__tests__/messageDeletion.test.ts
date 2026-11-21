import { messageDeletion } from "../messageDeletion";

describe("messageDeletion", () => {
  it("lets a sender delete their own message anywhere", () => {
    expect(messageDeletion({ senderId: "u", userId: "u", chatType: "DM" })).toBe("sender");
    expect(messageDeletion({ senderId: "u", userId: "u", chatType: "Group", adminIds: ["u"] })).toBe("sender");
  });

  it("lets a group admin delete someone else's message", () => {
    expect(messageDeletion({ senderId: "u", userId: "a", chatType: "Group", adminIds: ["a"] })).toBe("admin");
  });

  it("refuses everyone else, and admins in a DM", () => {
    expect(messageDeletion({ senderId: "u", userId: "x", chatType: "Group", adminIds: ["a"] })).toBeNull();
    expect(messageDeletion({ senderId: "u", userId: "a", chatType: "DM", adminIds: ["a"] })).toBeNull();
    expect(messageDeletion({ userId: "a", chatType: "Group", adminIds: [] })).toBeNull();
  });
});
