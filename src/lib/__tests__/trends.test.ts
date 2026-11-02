import {
  extractHashtags,
  parseTrendLimit,
  TREND_CACHE_TTL_MS,
  TREND_MAX_LIMIT,
  TREND_MIN_AUTHORS,
  TREND_SIDEBAR_LIMIT,
  TREND_WINDOW_HOURS,
} from "../trends";

describe("client-safe trends contract", () => {
  it("exports the shared MVP defaults", () => {
    expect([
      TREND_WINDOW_HOURS,
      TREND_CACHE_TTL_MS,
      TREND_MAX_LIMIT,
      TREND_SIDEBAR_LIMIT,
      TREND_MIN_AUTHORS,
    ]).toEqual([24, 300000, 20, 5, 3]);
  });

  it("extracts renderer-compatible ASCII tokens, lowercases and deduplicates per post", () => {
    expect(extractHashtags("#React #REACT text#Next_16 ##123 #a-b #café #東京 #_")).toEqual([
      "react",
      "next_16",
      "123",
      "a",
      "caf",
      "_",
    ]);
    expect(extractHashtags("#one#two #one_more #ONE")).toEqual(["one", "two", "one_more"]);
  });

  it.each([undefined, null, 12, {}, [], "", "no tags #"])("handles caption %p", (caption) => {
    expect(extractHashtags(caption)).toEqual([]);
  });

  it("defaults only omitted limits and accepts the inclusive range", () => {
    expect(parseTrendLimit(undefined)).toBe(5);
    for (let i = 1; i <= 20; i++) expect(parseTrendLimit(String(i))).toBe(i);
  });

  it.each([
    "",
    "0",
    "21",
    "-1",
    "1.5",
    "1.0",
    "1e1",
    "+5",
    " 5",
    "5 ",
    "NaN",
    "Infinity",
    "5\n",
    "9007199254740993",
    [],
    ["5"],
    ["1", "2"],
  ])("rejects limit %p", (value) => {
    expect(parseTrendLimit(value)).toBeNull();
  });
});
