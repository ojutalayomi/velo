import { dmKeyFor, planDmMerge } from "@/lib/dmKey";

describe("dmKeyFor", () => {
  it("is the same whichever user comes first", () => {
    expect(dmKeyFor("b", "a")).toBe(dmKeyFor("a", "b"));
    expect(dmKeyFor("a", "b")).toBe("a:b");
  });

  it("differs between different pairs", () => {
    expect(dmKeyFor("a", "b")).not.toBe(dmKeyFor("a", "c"));
  });
});

describe("planDmMerge", () => {
  it("keeps the oldest chat and removes the rest", () => {
    expect(planDmMerge(["65b", "65a", "65c"])).toEqual({ keepId: "65a", removeIds: ["65b", "65c"] });
  });

  it("leaves a single chat alone", () => {
    expect(planDmMerge(["65a"])).toEqual({ keepId: "65a", removeIds: [] });
  });

  it("rejects an empty list", () => {
    expect(() => planDmMerge([])).toThrow();
  });
});
