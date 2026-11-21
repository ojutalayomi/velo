import {
  draftChanged,
  draftPreview,
  isDraftEmpty,
  MAX_POST_DRAFTS,
  parseDrafts,
  removeDraft,
  upsertDraft,
} from "@/lib/postDrafts";

const content = { text: "hello", visibility: "everyone", poll: null, location: null };

describe("post drafts", () => {
  it("upserts newest first and replaces by id", () => {
    let drafts = upsertDraft([], "a", "post", content, 1);
    drafts = upsertDraft(drafts, "b", "post", { ...content, text: "two" }, 2);
    drafts = upsertDraft(drafts, "a", "post", { ...content, text: "one!" }, 3);
    expect(drafts.map((d) => d.id)).toEqual(["a", "b"]);
    expect(drafts[0].text).toBe("one!");
  });

  it("removes a draft and caps the list", () => {
    const many = Array.from({ length: MAX_POST_DRAFTS + 5 }, (_, i) => i).reduce(
      (acc, i) => upsertDraft(acc, `d${i}`, "post", content, i),
      [] as ReturnType<typeof upsertDraft>
    );
    expect(many).toHaveLength(MAX_POST_DRAFTS);
    expect(removeDraft(many, many[0].id)).toHaveLength(MAX_POST_DRAFTS - 1);
  });

  it("parses defensively", () => {
    expect(parseDrafts(null)).toEqual([]);
    expect(parseDrafts("not json")).toEqual([]);
    expect(parseDrafts('{"a":1}')).toEqual([]);
    const raw = JSON.stringify([
      { id: "x", scope: "post", text: "t", updatedAt: 1 },
      { id: 5 },
      { id: "y", scope: "post", text: "t2", updatedAt: 9 },
    ]);
    expect(parseDrafts(raw).map((d) => d.id)).toEqual(["y", "x"]);
  });

  it("detects empty and changed content, and builds previews", () => {
    expect(isDraftEmpty({ text: "  ", poll: null, location: null })).toBe(true);
    expect(isDraftEmpty({ text: "", poll: null, location: { name: "Lagos" } })).toBe(false);
    const [saved] = upsertDraft([], "a", "post", content, 1);
    expect(draftChanged(saved, content)).toBe(false);
    expect(draftChanged(saved, { ...content, text: "different" })).toBe(true);
    expect(draftChanged(undefined, content)).toBe(true);
    expect(draftPreview({ text: "", poll: null, location: { name: "Lagos" } })).toBe("📍 Lagos");
    expect(draftPreview({ text: "x".repeat(200), poll: null, location: null })).toHaveLength(138);
  });
});
