import { canPinMessages, MAX_PINNED_MESSAGES, pinBlockReason } from "@/lib/pinRules";

describe("canPinMessages", () => {
  it("lets either person in a DM pin", () => {
    expect(canPinMessages({ chatType: "DM", userId: "u1" })).toBe(true);
  });
  it("limits groups and channels to admins", () => {
    expect(canPinMessages({ chatType: "Group", adminIds: ["a"], userId: "u1" })).toBe(false);
    expect(canPinMessages({ chatType: "Group", adminIds: ["u1"], userId: "u1" })).toBe(true);
    expect(canPinMessages({ chatType: "Channels", userId: "u1" })).toBe(false);
  });
});

describe("pinBlockReason", () => {
  it("allows pinning below the limit and always allows unpinning", () => {
    expect(pinBlockReason({ isPinned: false, pinCount: MAX_PINNED_MESSAGES - 1, deleted: false })).toBeNull();
    expect(pinBlockReason({ isPinned: true, pinCount: MAX_PINNED_MESSAGES, deleted: false })).toBeNull();
  });
  it("refuses the sixth pin and deleted messages", () => {
    expect(pinBlockReason({ isPinned: false, pinCount: MAX_PINNED_MESSAGES, deleted: false })).toMatch(/up to 5/);
    expect(pinBlockReason({ isPinned: false, pinCount: 0, deleted: true })).toMatch(/Deleted/);
  });
});
