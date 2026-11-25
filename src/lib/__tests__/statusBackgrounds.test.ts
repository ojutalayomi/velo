import {
  DEFAULT_STATUS_BACKGROUND,
  isStatusBackground,
  STATUS_BACKGROUNDS,
  statusBackground,
} from "@/lib/statusBackgrounds";

describe("statusBackgrounds", () => {
  it("has unique ids, and the default is one of them", () => {
    const ids = STATUS_BACKGROUNDS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(isStatusBackground(DEFAULT_STATUS_BACKGROUND)).toBe(true);
  });

  it("only knows its own ids, and falls back to the first for an unknown one", () => {
    expect(isStatusBackground("ocean")).toBe(true);
    expect(isStatusBackground("hotpink")).toBe(false);
    expect(isStatusBackground(undefined)).toBe(false);
    expect(statusBackground("nope").id).toBe(STATUS_BACKGROUNDS[0].id);
    expect(statusBackground("ocean").id).toBe("ocean");
  });
});
