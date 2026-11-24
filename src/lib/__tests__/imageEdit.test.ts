import {
  baseRegion,
  clampOffset,
  DEFAULT_EDIT,
  editedName,
  filterString,
  frameRatio,
  isUnchanged,
  maxOffset,
  outputSize,
  outputType,
  paintEdit,
  rotatedSize,
} from "../imageEdit";

describe("frame geometry", () => {
  it("swaps the photo's sides when rotated a quarter turn", () => {
    expect(rotatedSize(400, 300, 90)).toEqual({ width: 300, height: 400 });
    expect(rotatedSize(400, 300, 180)).toEqual({ width: 400, height: 300 });
  });

  it("'original' follows the photo, presets are fixed", () => {
    expect(frameRatio("original", 400, 200)).toBe(2);
    expect(frameRatio("1:1", 400, 200)).toBe(1);
    expect(frameRatio("16:9", 10, 10)).toBeCloseTo(16 / 9);
  });

  it("finds the biggest area with the frame's shape", () => {
    expect(baseRegion(400, 300, 1)).toEqual({ width: 300, height: 300 });
    expect(baseRegion(400, 300, 16 / 9).width).toBe(400);
    expect(baseRegion(400, 300, 16 / 9).height).toBeCloseTo(225);
    expect(baseRegion(400, 300, 4 / 3)).toEqual({ width: 400, height: 300 });
  });

  it("allows no dragging when the photo exactly fills the frame, and more as you zoom", () => {
    expect(maxOffset(400, 300, 4 / 3, 1)).toEqual({ x: 0, y: 0 });
    const zoomed = maxOffset(400, 300, 4 / 3, 2);
    expect(zoomed.x).toBeCloseTo(0.5);
    expect(zoomed.y).toBeCloseTo(0.5);
  });

  it("keeps a dragged photo inside the frame", () => {
    expect(clampOffset({ x: 9, y: -9 }, 400, 300, 4 / 3, 2)).toEqual({ x: 0.5, y: -0.5 });
    expect(clampOffset({ x: 9, y: 9 }, 400, 300, 4 / 3, 1)).toEqual({ x: 0, y: 0 });
  });
});

describe("saving", () => {
  it("builds one filter string for preview and file", () => {
    expect(filterString(DEFAULT_EDIT)).toBe("brightness(100%) contrast(100%) saturate(100%)");
    expect(filterString({ ...DEFAULT_EDIT, brightness: 120, filter: "mono" })).toContain("grayscale(1)");
  });

  it("knows when nothing changed", () => {
    expect(isUnchanged(DEFAULT_EDIT)).toBe(true);
    expect(isUnchanged({ ...DEFAULT_EDIT, zoom: 1.2 })).toBe(false);
    expect(isUnchanged({ ...DEFAULT_EDIT, texts: [{ id: "a", text: "x", x: 0, y: 0, color: "#fff", size: 0.1, bold: false, italic: false }] })).toBe(false);
  });

  it("only writes formats the canvas can encode", () => {
    expect(outputType("image/jpeg")).toBe("image/jpeg");
    expect(outputType("image/webp")).toBe("image/webp");
    expect(outputType("image/gif")).toBe("image/png");
  });

  it("names edited files without stacking prefixes or lying about the type", () => {
    expect(editedName("photo.jpg", "image/jpeg")).toBe("edited-photo.jpg");
    expect(editedName("edited-photo.jpg", "image/jpeg")).toBe("edited-photo.jpg");
    expect(editedName("anim.gif", "image/png")).toBe("edited-anim.png");
    expect(editedName("pic.jpeg", "image/jpeg")).toBe("edited-pic.jpeg");
    expect(editedName("noext", "image/png")).toBe("edited-noext.png");
  });

  it("sizes the output from the crop, zoom and rotation, capped", () => {
    expect(outputSize(400, 300, 0, "original", 1)).toMatchObject({ width: 400, height: 300, scale: 1 });
    expect(outputSize(400, 300, 0, "1:1", 1)).toMatchObject({ width: 300, height: 300 });
    expect(outputSize(400, 300, 90, "original", 1)).toMatchObject({ width: 300, height: 400 });
    expect(outputSize(400, 300, 0, "original", 2)).toMatchObject({ width: 200, height: 150 });
    const big = outputSize(8000, 4000, 0, "original", 1);
    expect(Math.max(big.width, big.height)).toBe(4096);
    expect(big.scale).toBeCloseTo(0.512);
  });

  it("paints the photo centred and text at its fractional position", () => {
    const calls: string[] = [];
    const ctx = {
      filter: "",
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      translate: (x: number, y: number) => calls.push(`translate ${x},${y}`),
      rotate: (a: number) => calls.push(`rotate ${a}`),
      scale: (x: number) => calls.push(`scale ${x}`),
      drawImage: (_: unknown, x: number, y: number) => calls.push(`draw ${x},${y}`),
      fillText: (t: string, x: number, y: number) => calls.push(`text ${t} ${x},${y}`),
      font: "",
      fillStyle: "",
      textAlign: "",
      textBaseline: "",
    } as unknown as CanvasRenderingContext2D;
    const size = { width: 200, height: 100, scale: 1 };
    const painted = paintEdit(ctx, {} as CanvasImageSource, size, 200, 100, {
      ...DEFAULT_EDIT,
      offset: { x: 0.1, y: 0 },
      texts: [{ id: "a", text: "Hi", x: 0.5, y: 0.25, color: "#fff", size: 0.2, bold: true, italic: false }],
    });
    expect(painted).toBe(true);
    expect(calls).toContain("translate 120,50");
    expect(calls).toContain("draw -100,-50");
    expect(calls).toContain("text Hi 100,25");
    expect((ctx as unknown as { font: string }).font).toBe("bold 20px Arial, Helvetica, sans-serif");
  });
});
