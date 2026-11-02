/** @jest-environment node */
import type { MongoDBClient } from "../mongodb";
import { buildCaptionRegex, fetchPostsByCaptionMatch } from "../postSearch";
import { extractHashtags } from "../trends";

// Importing and using this module must never create a second MongoDB connection.
jest.mock("../mongodb", () => ({
  MongoDBClient: jest.fn(() => {
    throw new Error("unexpected init");
  }),
}));

describe("caption search patterns", () => {
  it("matches complete ASCII hashtag tokens case-insensitively, not prefixes", () => {
    const regex = new RegExp(buildCaptionRegex("hashtag", "  Velo  ")!, "i");
    for (const caption of ["#velo", "text#VELO!", "##velo", "#velo-é", "#velo東京"]) {
      expect(regex.test(caption)).toBe(true);
      expect(extractHashtags(caption)).toContain("velo");
    }
    for (const caption of ["#velocity", "#velo_more", "#velo2", "velo", "#_velo"]) {
      expect(regex.test(caption)).toBe(false);
      expect(extractHashtags(caption)).not.toContain("velo");
    }

    const underscore = new RegExp(buildCaptionRegex("hashtag", "tag_")!, "i");
    expect(underscore.test("#tag_!")).toBe(true);
    expect(underscore.test("#tag_more")).toBe(false);
  });
  it.each(["", "#velo", "a-b", "a.b", "a|b", "café", "東京"])(
    "rejects non-token hashtag %p",
    (term) => {
      expect(buildCaptionRegex("hashtag", term)).toBeNull();
    }
  );
  it("escapes free text without changing it to token search", () => {
    const regex = new RegExp(buildCaptionRegex("text", "  a.b [x]  ")!, "i");
    expect(regex.test("prefix A.B [x]suffix")).toBe(true);
    expect(regex.test("aXb x")).toBe(false);
  });
});

describe("public-only caption queries", () => {
  it.each(["hashtag", "text"] as const)(
    "filters all source collections before pagination for %s",
    async (kind) => {
      const posts = [{ PostID: "public1" }, { PostID: "public2" }, { PostID: "public3" }];
      const aggregate = jest.fn().mockReturnValue({ toArray: async () => posts });
      const db = { posts: () => ({ aggregate }) } as unknown as MongoDBClient;
      const result = await fetchPostsByCaptionMatch(db, { kind, term: "velo", skip: 10, limit: 2 });
      const match = {
        $match: {
          Visibility: "everyone",
          Caption: {
            $regex: buildCaptionRegex(kind, "velo"),
            $options: "i",
          },
        },
      };
      expect(aggregate).toHaveBeenCalledWith([
        match,
        { $unionWith: { coll: "Posts_Shares", pipeline: [match] } },
        { $unionWith: { coll: "Posts_Comments", pipeline: [match] } },
        { $sort: { TimeOfPost: -1 } },
        { $skip: 10 },
        { $limit: 3 },
      ]);
      expect(result).toEqual({ posts: posts.slice(0, 2), hasMore: true });
    }
  );
  it("does not query invalid tags or empty text", async () => {
    const posts = jest.fn();
    const db = { posts } as unknown as MongoDBClient;
    for (const [kind, term] of [
      ["hashtag", "a.*"],
      ["text", "  "],
    ] as const) {
      expect(await fetchPostsByCaptionMatch(db, { kind, term, skip: 0, limit: 5 })).toEqual({
        posts: [],
        hasMore: false,
      });
    }
    expect(posts).not.toHaveBeenCalled();
  });
  it("hasMore is false when there is no lookahead row", async () => {
    const aggregate = jest.fn().mockReturnValue({ toArray: async () => [] });
    const db = { posts: () => ({ aggregate }) } as unknown as MongoDBClient;
    expect(
      await fetchPostsByCaptionMatch(db, { kind: "text", term: "velo", skip: 0, limit: 5 })
    ).toEqual({ posts: [], hasMore: false });
  });
});
