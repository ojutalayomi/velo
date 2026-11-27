import type { CSSProperties } from "react";

/**
 * A chat's wallpaper is one string in the person's own chat settings, so it is theirs alone:
 *  - ""              the default (no wallpaper)
 *  - "preset:<id>"   one of the built-in backgrounds below
 *  - an https link   a photo they uploaded to our storage
 */
export const MAX_WALLPAPER_BYTES = 5 * 1024 * 1024;
export const MAX_WALLPAPER_LENGTH = 500;

export type WallpaperPreset = { id: string; label: string; background: string };

/** Soft backgrounds that keep both the sent and the received bubbles readable. */
export const WALLPAPER_PRESETS: readonly WallpaperPreset[] = [
  { id: "sand", label: "Sand", background: "linear-gradient(160deg, #fdf6ec, #f1dfc6)" },
  { id: "mint", label: "Mint", background: "linear-gradient(160deg, #e9f6ee, #cde6d6)" },
  { id: "sky", label: "Sky", background: "linear-gradient(160deg, #eaf2fc, #cfe1f6)" },
  { id: "blush", label: "Blush", background: "linear-gradient(160deg, #fdeff1, #f6d3da)" },
  { id: "lavender", label: "Lavender", background: "linear-gradient(160deg, #f2edfc, #d9cdf4)" },
  { id: "ember", label: "Ember", background: "linear-gradient(160deg, #ff8a78, #ff6257)" },
  { id: "dusk", label: "Dusk", background: "linear-gradient(160deg, #343758, #1a1b2e)" },
  { id: "forest", label: "Forest", background: "linear-gradient(160deg, #24473a, #112219)" },
];

const PRESET_PREFIX = "preset:";
/** Our own storage buckets: the post bucket the upload goes to, and the chat one. */
const WALLPAPER_HOST = /^(post-s|files-for-chat)\.s3([.-][a-z0-9-]+)*\.amazonaws\.com$/;

export const presetValue = (id: string) => `${PRESET_PREFIX}${id}`;

const isOurImageUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && WALLPAPER_HOST.test(url.hostname);
  } catch {
    return false;
  }
};

/** What the settings API accepts: nothing, a known preset, or a link into our storage. */
export function isValidWallpaper(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_WALLPAPER_LENGTH) return false;
  if (value === "") return true;
  if (value.startsWith(PRESET_PREFIX)) return WALLPAPER_PRESETS.some((p) => presetValue(p.id) === value);
  return isOurImageUrl(value);
}

export type Wallpaper =
  | { kind: "none" }
  | { kind: "preset"; preset: WallpaperPreset }
  | { kind: "image"; url: string };

export function parseWallpaper(value?: string | null): Wallpaper {
  if (!value) return { kind: "none" };
  if (value.startsWith(PRESET_PREFIX)) {
    const preset = WALLPAPER_PRESETS.find((p) => presetValue(p.id) === value);
    return preset ? { kind: "preset", preset } : { kind: "none" };
  }
  // Anything that isn't a link into our storage (an old value, say) is ignored rather than loaded.
  return isOurImageUrl(value) ? { kind: "image", url: value } : { kind: "none" };
}

/** Inline style for the chat's message area, or undefined for the default look. */
export function wallpaperStyle(value?: string | null): CSSProperties | undefined {
  const wallpaper = parseWallpaper(value);
  if (wallpaper.kind === "preset") return { background: wallpaper.preset.background };
  if (wallpaper.kind === "image") {
    return {
      backgroundImage: `url("${wallpaper.url.replace(/"/g, "%22")}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  return undefined;
}

/** Why a picked file can't be a wallpaper, or null when it can. */
export function wallpaperFileError(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith("image/")) return "Choose an image file";
  if (file.size > MAX_WALLPAPER_BYTES) return "The image must be 5MB or smaller";
  return null;
}
