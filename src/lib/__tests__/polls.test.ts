import {
  isPollClosed,
  lastMessagePreview,
  parsePollContent,
  sanitizePoll,
  validateVote,
} from "@/lib/polls";

const poll = sanitizePoll({ question: "Lunch?", options: ["Rice", "Beans", "Yam"], multiple: false })!;

describe("polls", () => {
  it("sanitizes input and rejects invalid polls", () => {
    expect(poll.options).toEqual(["Rice", "Beans", "Yam"]);
    expect(sanitizePoll({ question: "Q", options: ["a"] })).toBeNull();
    expect(sanitizePoll({ question: "Q", options: ["a", "A"] })).toBeNull();
    expect(sanitizePoll(null)).toBeNull();
  });

  it("validates votes against the poll", () => {
    expect(validateVote(poll, [1])).toEqual([1]);
    expect(validateVote(poll, [0, 1])).toBeNull(); // single choice
    expect(validateVote(poll, [3])).toBeNull(); // out of range
    expect(validateVote(poll, [])).toBeNull();
    const multi = { ...poll, multiple: true };
    expect(validateVote(multi, [2, 0, 2])).toEqual([0, 2]);
  });

  it("detects closed polls", () => {
    expect(isPollClosed({ ...poll, expiresAt: new Date(Date.now() - 1000).toISOString() })).toBe(true);
    expect(isPollClosed(poll)).toBe(false);
  });

  it("parses poll message content and previews it", () => {
    expect(parsePollContent(JSON.stringify(poll))).toEqual(poll);
    expect(parsePollContent("hello")).toBeNull();
    expect(parsePollContent("{bad json")).toBeNull();
    expect(lastMessagePreview(JSON.stringify(poll))).toBe("📊 Lunch?");
    expect(lastMessagePreview("plain")).toBe("plain");
  });
});
