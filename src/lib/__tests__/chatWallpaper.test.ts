import {
  WALLPAPER_PRESETS,
  isValidWallpaper,
  parseWallpaper,
  presetValue,
  wallpaperFileError,
  wallpaperStyle,
} from "../chatWallpaper";

const photo = "https://post-s.s3.us-east-1.amazonaws.com/2026/11/bg%20one.png";

describe("isValidWallpaper", () => {
  it("accepts nothing, a built-in preset, or an image in our own storage", () => {
    expect(isValidWallpaper("")).toBe(true);
    expect(isValidWallpaper(presetValue(WALLPAPER_PRESETS[0].id))).toBe(true);
    expect(isValidWallpaper(photo)).toBe(true);
    expect(isValidWallpaper("https://files-for-chat.s3.amazonaws.com/a.png")).toBe(true);
  });

  it("refuses everything else", () => {
    expect(isValidWallpaper("preset:nope")).toBe(false);
    expect(isValidWallpaper("data:image/png;base64,AAAA")).toBe(false);
    expect(isValidWallpaper("https://evil.example.com/a.png")).toBe(false);
    expect(isValidWallpaper("http://post-s.s3.amazonaws.com/a.png")).toBe(false);
    expect(isValidWallpaper("https://post-s.s3.amazonaws.com.evil.com/a.png")).toBe(false);
    expect(isValidWallpaper(photo + "a".repeat(500))).toBe(false);
    expect(isValidWallpaper(undefined)).toBe(false);
    expect(isValidWallpaper(5)).toBe(false);
  });
});

describe("parseWallpaper and wallpaperStyle", () => {
  it("reads each kind", () => {
    expect(parseWallpaper("")).toEqual({ kind: "none" });
    expect(parseWallpaper(undefined)).toEqual({ kind: "none" });
    expect(parseWallpaper("preset:sky")).toMatchObject({ kind: "preset", preset: { id: "sky" } });
    expect(parseWallpaper(photo)).toEqual({ kind: "image", url: photo });
  });

  it("ignores values it should never load", () => {
    expect(parseWallpaper("preset:gone")).toEqual({ kind: "none" });
    expect(parseWallpaper("https://evil.example.com/a.png")).toEqual({ kind: "none" });
    expect(parseWallpaper("data:image/png;base64,AAAA")).toEqual({ kind: "none" });
  });

  it("styles the chat for a preset or a photo, and leaves the default alone", () => {
    expect(wallpaperStyle("")).toBeUndefined();
    expect(wallpaperStyle("preset:sky")?.background).toContain("linear-gradient");
    const style = wallpaperStyle(photo);
    expect(style?.backgroundImage).toBe(`url("${photo}")`);
    expect(style?.backgroundSize).toBe("cover");
  });
});

describe("wallpaperFileError", () => {
  it("takes images up to 5MB", () => {
    expect(wallpaperFileError({ type: "image/png", size: 1000 })).toBeNull();
    expect(wallpaperFileError({ type: "image/png", size: 5 * 1024 * 1024 })).toBeNull();
  });
  it("refuses other files and big images", () => {
    expect(wallpaperFileError({ type: "video/mp4", size: 1000 })).toMatch(/image/);
    expect(wallpaperFileError({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toMatch(/5MB/);
  });
});
