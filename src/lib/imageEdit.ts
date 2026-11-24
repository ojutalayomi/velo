/**
 * The maths behind the photo editor, kept free of React and the DOM so the preview and the saved
 * file are computed the same way (and can be tested).
 *
 * Everything is expressed relative to the crop frame, never in screen pixels:
 * - `zoom` ≥ 1 shrinks the area of the photo that fills the frame.
 * - `offset` is how far the photo is dragged, as a fraction of the frame's width/height.
 * - text `x`/`y` are the text's centre, as a fraction of the frame; `size` is a fraction of its height.
 * So whatever size the preview happens to be drawn at, the saved image has the same framing.
 */

export type AspectId = "original" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16";

export const ASPECTS: { id: AspectId; label: string; ratio: number | null }[] = [
  { id: "original", label: "Original", ratio: null },
  { id: "1:1", label: "Square", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

export type Rotation = 0 | 90 | 180 | 270;

export type FilterId = "none" | "vivid" | "mono" | "retro" | "warm" | "cool";

/** CSS/canvas filter for each preset (applied after the brightness/contrast/saturation sliders). */
export const FILTER_PRESETS: { id: FilterId; label: string; css: string }[] = [
  { id: "none", label: "Original", css: "" },
  { id: "vivid", label: "Vivid", css: "saturate(1.45) contrast(1.06)" },
  { id: "mono", label: "Mono", css: "grayscale(1) contrast(1.05)" },
  { id: "retro", label: "Retro", css: "sepia(0.5) hue-rotate(-20deg) saturate(1.1)" },
  { id: "warm", label: "Warm", css: "sepia(0.25) saturate(1.2) brightness(1.03)" },
  { id: "cool", label: "Cool", css: "hue-rotate(12deg) saturate(1.1) brightness(1.02)" },
];

export type TextItem = {
  id: string;
  text: string;
  /** Centre of the text, 0–1 across the frame. */
  x: number;
  y: number;
  color: string;
  /** Font size as a fraction of the frame's height. */
  size: number;
  bold: boolean;
  italic: boolean;
};

export type PhotoEdit = {
  aspect: AspectId;
  zoom: number;
  rotation: Rotation;
  offset: { x: number; y: number };
  brightness: number;
  contrast: number;
  saturation: number;
  filter: FilterId;
  texts: TextItem[];
};

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
/** The longest side of a saved photo; bigger originals are scaled down to this. */
export const MAX_OUTPUT_SIDE = 4096;

export const DEFAULT_EDIT: PhotoEdit = {
  aspect: "original",
  zoom: 1,
  rotation: 0,
  offset: { x: 0, y: 0 },
  brightness: 100,
  contrast: 100,
  saturation: 100,
  filter: "none",
  texts: [],
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Size of the photo once rotated. */
export function rotatedSize(width: number, height: number, rotation: Rotation) {
  return rotation === 90 || rotation === 270
    ? { width: height, height: width }
    : { width, height };
}

/** Width ÷ height of the crop frame. "Original" follows the (rotated) photo. */
export function frameRatio(aspect: AspectId, width: number, height: number): number {
  const preset = ASPECTS.find((item) => item.id === aspect)?.ratio;
  return preset ?? (width > 0 && height > 0 ? width / height : 1);
}

/**
 * The largest area of a `width` × `height` photo with the frame's shape. At zoom 1 this is exactly
 * what the frame shows; zooming in shows `1/zoom` of each side.
 */
export function baseRegion(width: number, height: number, ratio: number) {
  return width / height > ratio
    ? { width: height * ratio, height }
    : { width, height: width / ratio };
}

/** How far the photo may be dragged before the frame would show empty space (fractions of the frame). */
export function maxOffset(width: number, height: number, ratio: number, zoom: number) {
  const base = baseRegion(width, height, ratio);
  const regionW = base.width / zoom;
  const regionH = base.height / zoom;
  return {
    x: Math.max(0, (width - regionW) / 2 / regionW),
    y: Math.max(0, (height - regionH) / 2 / regionH),
  };
}

export function clampOffset(
  offset: { x: number; y: number },
  width: number,
  height: number,
  ratio: number,
  zoom: number
) {
  const limit = maxOffset(width, height, ratio, zoom);
  return { x: clamp(offset.x, -limit.x, limit.x), y: clamp(offset.y, -limit.y, limit.y) };
}

/** The filter shared by the preview (CSS) and the saved file (canvas). */
export function filterString(edit: Pick<PhotoEdit, "brightness" | "contrast" | "saturation" | "filter">) {
  const preset = FILTER_PRESETS.find((item) => item.id === edit.filter)?.css ?? "";
  return `brightness(${edit.brightness}%) contrast(${edit.contrast}%) saturate(${edit.saturation}%) ${preset}`.trim();
}

/** True when saving would produce the same picture as the original. */
export function isUnchanged(edit: PhotoEdit): boolean {
  return (
    edit.aspect === DEFAULT_EDIT.aspect &&
    edit.zoom === 1 &&
    edit.rotation === 0 &&
    edit.offset.x === 0 &&
    edit.offset.y === 0 &&
    edit.brightness === 100 &&
    edit.contrast === 100 &&
    edit.saturation === 100 &&
    edit.filter === "none" &&
    edit.texts.length === 0
  );
}

/** Canvas can write JPEG, PNG and WebP; anything else (GIF, AVIF, ...) is saved as PNG. */
export function outputType(mime: string): "image/jpeg" | "image/png" | "image/webp" {
  return mime === "image/jpeg" || mime === "image/webp" ? mime : "image/png";
}

const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** `photo.gif` → `edited-photo.png`; editing an edited photo again doesn't stack prefixes. */
export function editedName(name: string, mime: string): string {
  const base = name.replace(/^edited-/, "");
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = EXTENSION[mime] ?? "png";
  const original = dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
  // Keep `.jpeg` as typed when the type didn't change.
  const keep = mime === "image/jpeg" && original === "jpeg" ? "jpeg" : ext;
  return `edited-${stem}.${keep}`;
}

/** Output size in pixels for the saved photo, never larger than the original and capped to a sane maximum. */
export function outputSize(
  width: number,
  height: number,
  rotation: Rotation,
  aspect: AspectId,
  zoom: number
) {
  const rotated = rotatedSize(width, height, rotation);
  const ratio = frameRatio(aspect, rotated.width, rotated.height);
  const base = baseRegion(rotated.width, rotated.height, ratio);
  const w = base.width / zoom;
  const h = base.height / zoom;
  const k = Math.min(1, MAX_OUTPUT_SIDE / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)), scale: k };
}

/** Draw the edited photo onto a canvas. Returns false when the browser can't apply filters. */
export function paintEdit(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number },
  size: { width: number; height: number; scale: number },
  naturalWidth: number,
  naturalHeight: number,
  edit: PhotoEdit
): boolean {
  const canFilter = "filter" in ctx;
  ctx.save();
  if (canFilter) ctx.filter = filterString(edit);
  ctx.translate(size.width / 2 + edit.offset.x * size.width, size.height / 2 + edit.offset.y * size.height);
  ctx.rotate((edit.rotation * Math.PI) / 180);
  ctx.scale(size.scale, size.scale);
  ctx.drawImage(image, -naturalWidth / 2, -naturalHeight / 2);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const item of edit.texts) {
    if (!item.text.trim()) continue;
    ctx.font = `${item.italic ? "italic " : ""}${item.bold ? "bold " : ""}${item.size * size.height}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.x * size.width, item.y * size.height);
  }
  ctx.restore();
  return canFilter;
}
