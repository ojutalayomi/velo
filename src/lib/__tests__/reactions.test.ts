import { groupReactions, visibleReactions } from "@/lib/reactions";

const r = (reaction: string, userId: string) => ({ reaction, userId });

describe("groupReactions", () => {
  it("groups by emoji, most used first, and flags the viewer's own", () => {
    const groups = groupReactions([r("😂", "a"), r("👍", "b"), r("👍", "me"), r("❤️", "c")], "me");
    expect(groups.map((g) => [g.emoji, g.count, g.mine])).toEqual([
      ["👍", 2, true],
      ["😂", 1, false],
      ["❤️", 1, false],
    ]);
    expect(groups[0].userIds).toEqual(["b", "me"]);
  });
});

describe("visibleReactions", () => {
  it("counts the reactions hidden beyond the limit, not the emoji", () => {
    const groups = groupReactions(
      [r("1", "a"), r("2", "a"), r("3", "a"), r("4", "a"), r("5", "a"), r("5", "b"), r("6", "a")],
      "me"
    );
    const { shown, hidden } = visibleReactions(groups, 4);
    expect(shown).toHaveLength(4);
    expect(hidden).toBe(2);
    expect(visibleReactions(groups.slice(0, 2), 4).hidden).toBe(0);
  });
});
