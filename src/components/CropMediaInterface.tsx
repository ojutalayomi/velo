"use client";

/* eslint-disable @next/next/no-img-element */
import {
  Bold,
  Check,
  Crop,
  Italic,
  Loader2,
  Minus,
  Plus,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  X,
} from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "@/lib/toast";

import {
  FullscreenSheet,
  FullscreenSheetContent,
  FullscreenSheetDescription,
  FullscreenSheetTitle,
  FullscreenSheetTrigger,
  SheetIconButton,
} from "@/components/ui/fullscreen-sheet";
import {
  ASPECTS,
  clamp,
  clampOffset,
  DEFAULT_EDIT,
  editedName,
  FILTER_PRESETS,
  type FilterId,
  filterString,
  frameRatio,
  isUnchanged,
  MAX_ZOOM,
  MIN_ZOOM,
  outputSize,
  outputType,
  paintEdit,
  type PhotoEdit,
  rotatedSize,
  baseRegion,
  type Rotation,
  type TextItem,
} from "@/lib/imageEdit";
import { cn } from "@/lib/utils";

type Props = {
  /** The button that opens the editor. */
  children: ReactNode;
  files: File[];
  setFiles: (files: File[]) => void;
  imageIndex: number;
};

/**
 * Photo editor: crop (shape, zoom, drag, rotate), light and colour, filters and text.
 * It opens full screen, so it works the same on a phone and on a desktop, and edits the photo
 * non-destructively until Save replaces the file in the list.
 */
const CropMediaInterface = ({ children, files, setFiles, imageIndex }: Props) => {
  const [open, setOpen] = useState(false);
  const file = files[imageIndex];

  return (
    <FullscreenSheet open={open} onOpenChange={setOpen}>
      <FullscreenSheetTrigger asChild>{children}</FullscreenSheetTrigger>
      <FullscreenSheetContent>
        {/* Mounted only while open, so every edit session starts fresh. */}
        {open && file && (
          <Editor
            file={file}
            onCancel={() => setOpen(false)}
            onSave={(edited) => {
              const next = [...files];
              next[imageIndex] = edited;
              setFiles(next);
              setOpen(false);
            }}
          />
        )}
      </FullscreenSheetContent>
    </FullscreenSheet>
  );
};

type Tab = "crop" | "adjust" | "filters" | "text";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "crop", label: "Crop", icon: <Crop size={20} /> },
  { id: "adjust", label: "Adjust", icon: <SlidersHorizontal size={20} /> },
  { id: "filters", label: "Filters", icon: <Sparkles size={20} /> },
  { id: "text", label: "Text", icon: <Type size={20} /> },
];

const TEXT_COLORS = ["#ffffff", "#000000", "#ff6257", "#ffd23f", "#3ddc97", "#4cc9f0", "#9b5de5"];
const TEXT_SIZES = [
  { label: "S", value: 0.045 },
  { label: "M", value: 0.07 },
  { label: "L", value: 0.1 },
  { label: "XL", value: 0.14 },
];

const FRAME_PADDING = 16;

function Editor({
  file,
  onCancel,
  onSave,
}: {
  file: File;
  onCancel: () => void;
  onSave: (file: File) => void;
}) {
  const [edit, setEdit] = useState<PhotoEdit>(DEFAULT_EDIT);
  const [tab, setTab] = useState<Tab>("crop");
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // One object URL per editing session, released when the editor closes.
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setStage({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Geometry shared by the preview and the saved file.
  const rotated = natural ? rotatedSize(natural.width, natural.height, edit.rotation) : null;
  const ratio = rotated ? frameRatio(edit.aspect, rotated.width, rotated.height) : 1;
  const availW = Math.max(stage.width - FRAME_PADDING * 2, 0);
  const availH = Math.max(stage.height - FRAME_PADDING * 2, 0);
  const frame =
    !availW || !availH
      ? { width: 0, height: 0 }
      : availW / availH > ratio
        ? { width: availH * ratio, height: availH }
        : { width: availW, height: availW / ratio };
  const base = rotated ? baseRegion(rotated.width, rotated.height, ratio) : null;
  // Frame pixels per photo pixel.
  const scale = base ? (frame.width * edit.zoom) / base.width : 1;

  const patch = useCallback((changes: Partial<PhotoEdit>) => setEdit((prev) => ({ ...prev, ...changes })), []);

  /** Change something that affects how far the photo can be dragged, keeping it inside the frame. */
  const reframe = useCallback(
    (changes: Partial<Pick<PhotoEdit, "aspect" | "zoom" | "rotation">>) => {
      if (!natural) return;
      setEdit((prev) => {
        const next = { ...prev, ...changes };
        next.zoom = clamp(next.zoom, MIN_ZOOM, MAX_ZOOM);
        const size = rotatedSize(natural.width, natural.height, next.rotation);
        const nextRatio = frameRatio(next.aspect, size.width, size.height);
        next.offset = clampOffset(next.offset, size.width, size.height, nextRatio, next.zoom);
        return next;
      });
    },
    [natural]
  );

  const zoomBy = useCallback(
    (factor: number) => reframe({ zoom: edit.zoom * factor }),
    [edit.zoom, reframe]
  );

  /* ---- dragging the photo, pinching to zoom, scrolling to zoom ---- */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  const onFrameDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    setSelectedId("");
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const onFrameMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous || !rotated || !frame.width) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) zoomBy(distance / pinch.current);
      pinch.current = distance;
      return;
    }

    const dx = (event.clientX - previous.x) / frame.width;
    const dy = (event.clientY - previous.y) / frame.height;
    setEdit((prev) => ({
      ...prev,
      offset: clampOffset(
        { x: prev.offset.x + dx, y: prev.offset.y + dy },
        rotated.width,
        rotated.height,
        ratio,
        prev.zoom
      ),
    }));
  };

  const onFrameUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  // React attaches wheel listeners as passive, so a native one is needed to stop the page scrolling.
  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomBy(Math.exp(-event.deltaY * 0.0015));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [zoomBy, natural]);

  /* ---- text ---- */
  const selected = edit.texts.find((item) => item.id === selectedId);

  const updateText = (id: string, changes: Partial<TextItem>) =>
    setEdit((prev) => ({
      ...prev,
      texts: prev.texts.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    }));

  const addText = () => {
    const item: TextItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: "Your text",
      x: 0.5,
      y: 0.5,
      color: selected?.color ?? "#ffffff",
      size: selected?.size ?? 0.07,
      bold: selected?.bold ?? true,
      italic: false,
    };
    setEdit((prev) => ({ ...prev, texts: [...prev.texts, item] }));
    setSelectedId(item.id);
  };

  const removeText = () => {
    if (!selected) return;
    setEdit((prev) => ({ ...prev, texts: prev.texts.filter((item) => item.id !== selected.id) }));
    setSelectedId("");
  };

  const textDrag = useRef<string | null>(null);

  const onTextDown = (event: ReactPointerEvent<HTMLDivElement>, id: string) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    textDrag.current = id;
    setSelectedId(id);
    setTab("text");
  };

  const onTextMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const id = textDrag.current;
    const node = frameRef.current;
    if (!id || !node) return;
    const rect = node.getBoundingClientRect();
    updateText(id, {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    });
  };

  const onTextUp = () => {
    textDrag.current = null;
  };

  /* ---- save ---- */
  const handleSave = async () => {
    const image = imageRef.current;
    if (!image || !natural) return;
    if (isUnchanged(edit)) {
      onCancel();
      return;
    }
    setSaving(true);
    try {
      const size = outputSize(natural.width, natural.height, edit.rotation, edit.aspect, edit.zoom);
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas isn't available");

      const type = outputType(file.type);
      if (type === "image/jpeg") {
        // JPEG has no transparency: paint white first so transparent areas don't turn black.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const filtered = paintEdit(ctx, image, size, natural.width, natural.height, edit);
      if (!filtered && filterString(edit) !== filterString(DEFAULT_EDIT)) {
        toast.info("This browser can't apply filters or light changes, so they were left out.");
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
      if (!blob) throw new Error("Couldn't export the image");
      onSave(new File([blob], editedName(file.name, type), { type, lastModified: Date.now() }));
    } catch (error) {
      console.error("Error processing the image:", error);
      toast.error("Couldn't save your changes", { description: "Try again, or send the original photo." });
    } finally {
      setSaving(false);
    }
  };

  const filter = filterString(edit);
  const imageStyle = natural
    ? {
        width: natural.width,
        height: natural.height,
        transform: `translate(-50%, -50%) translate(${edit.offset.x * frame.width}px, ${edit.offset.y * frame.height}px) rotate(${edit.rotation}deg) scale(${scale})`,
        filter,
      }
    : undefined;
  const changed = !isUnchanged(edit);

  return (
    <>
      <header className="flex items-center gap-1 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <SheetIconButton aria-label="Cancel editing" onClick={onCancel}>
          <X size={22} />
        </SheetIconButton>
        <FullscreenSheetTitle className="flex-1 px-1 text-base font-semibold">Edit photo</FullscreenSheetTitle>
        <FullscreenSheetDescription className="sr-only">
          Crop, adjust, filter and add text to the photo before sending
        </FullscreenSheetDescription>
        <button
          type="button"
          disabled={!changed || saving}
          onClick={() => {
            setEdit(DEFAULT_EDIT);
            setSelectedId("");
          }}
          className="rounded-full px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          Reset
        </button>
        <button
          type="button"
          disabled={saving || !natural}
          onClick={() => void handleSave()}
          className="flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition-opacity hover:bg-brand/90 disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? "Saving" : "Done"}
        </button>
      </header>

      {/* Stage: the photo is dragged and pinched inside the frame; what's outside it is dimmed. */}
      <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden bg-black">
        {!natural && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="animate-spin text-white/60" />
          </div>
        )}
        {/* Hidden copy that is measured and painted onto the canvas when saving. */}
        <img
          ref={imageRef}
          src={url}
          alt=""
          className="hidden"
          onLoad={(event) =>
            setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
          }
        />
        {natural && frame.width > 0 && (
          <div
            ref={frameRef}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 touch-none select-none"
            style={{ width: frame.width, height: frame.height, cursor: "grab" }}
            onPointerDown={onFrameDown}
            onPointerMove={onFrameMove}
            onPointerUp={onFrameUp}
            onPointerCancel={onFrameUp}
          >
            {/* The part of the photo outside the frame, faded, so it's clear what gets cut off. */}
            <img
              src={url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none opacity-30"
              style={imageStyle}
            />
            <div className="absolute inset-0 overflow-hidden rounded-sm ring-2 ring-white/90">
              <img
                src={url}
                alt={file.name}
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                style={imageStyle}
              />

              {tab === "crop" && (
                <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i} className="border border-white/25" />
                  ))}
                </div>
              )}

              {edit.texts.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Text: ${item.text}`}
                  onPointerDown={(event) => onTextDown(event, item.id)}
                  onPointerMove={onTextMove}
                  onPointerUp={onTextUp}
                  onPointerCancel={onTextUp}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 cursor-move touch-none whitespace-pre px-1 leading-none",
                    selectedId === item.id && "outline-solid outline-2 outline-dashed outline-white/90"
                  )}
                  style={{
                    left: `${item.x * 100}%`,
                    top: `${item.y * 100}%`,
                    color: item.color,
                    fontSize: item.size * frame.height,
                    fontWeight: item.bold ? 700 : 400,
                    fontStyle: item.italic ? "italic" : "normal",
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tool panel + tab bar. On wide screens the panel stays a comfortable width. */}
      <div className="border-t border-white/10 bg-zinc-900">
        <div className="mx-auto min-h-28 w-full max-w-2xl px-4 py-3">
          {tab === "crop" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Crop shape">
                {ASPECTS.map((item) => (
                  <Chip
                    key={item.id}
                    active={edit.aspect === item.id}
                    onClick={() => reframe({ aspect: item.id })}
                  >
                    {item.label}
                  </Chip>
                ))}
                <button
                  type="button"
                  aria-label="Rotate 90 degrees"
                  onClick={() => reframe({ rotation: ((edit.rotation + 90) % 360) as Rotation })}
                  className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <RotateCw size={18} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => zoomBy(1 / 1.15)}
                  className="rounded-full p-1 text-white/70 hover:text-white"
                >
                  <Minus size={20} />
                </button>
                <input
                  type="range"
                  aria-label="Zoom"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={edit.zoom}
                  onChange={(event) => reframe({ zoom: Number(event.target.value) })}
                  className="h-8 flex-1 accent-brand"
                />
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => zoomBy(1.15)}
                  className="rounded-full p-1 text-white/70 hover:text-white"
                >
                  <Plus size={20} />
                </button>
              </div>
              <p className="text-center text-xs text-white/50">Drag to reposition. Pinch or scroll to zoom.</p>
            </div>
          )}

          {tab === "adjust" && (
            <div className="space-y-1">
              <Slider label="Brightness" value={edit.brightness} onChange={(brightness) => patch({ brightness })} />
              <Slider label="Contrast" value={edit.contrast} onChange={(contrast) => patch({ contrast })} />
              <Slider label="Saturation" value={edit.saturation} onChange={(saturation) => patch({ saturation })} />
            </div>
          )}

          {tab === "filters" && (
            <div className="flex gap-3 overflow-x-auto pb-1" role="radiogroup" aria-label="Filter">
              {FILTER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={edit.filter === preset.id}
                  onClick={() => patch({ filter: preset.id as FilterId })}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "block size-16 overflow-hidden rounded-xl border-2 bg-zinc-800 transition",
                      edit.filter === preset.id ? "border-brand" : "border-transparent"
                    )}
                  >
                    <img
                      src={url}
                      alt=""
                      draggable={false}
                      className="size-full object-cover"
                      style={{ filter: preset.css || undefined }}
                    />
                  </span>
                  <span className={cn("text-xs", edit.filter === preset.id ? "text-brand" : "text-white/70")}>
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {tab === "text" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label="Text"
                  value={selected?.text ?? ""}
                  disabled={!selected}
                  maxLength={120}
                  onChange={(event) => selected && updateText(selected.id, { text: event.target.value })}
                  placeholder={selected ? "Type your text" : "Add text, then drag it into place"}
                  className="h-10 min-w-0 flex-1 rounded-full bg-zinc-800 px-4 text-sm text-white placeholder:text-white/40 focus:outline-hidden focus:ring-2 focus:ring-brand disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={addText}
                  className="h-10 shrink-0 rounded-full bg-brand px-4 text-sm font-semibold text-white hover:bg-brand/90"
                >
                  Add text
                </button>
              </div>
              <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", !selected && "pointer-events-none opacity-40")}>
                <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Text colour">
                  {TEXT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={selected?.color === color}
                      aria-label={`Colour ${color}`}
                      onClick={() => selected && updateText(selected.id, { color })}
                      className={cn(
                        "size-7 rounded-full border-2 transition",
                        selected?.color === color ? "scale-110 border-brand" : "border-white/30"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1" role="radiogroup" aria-label="Text size">
                  {TEXT_SIZES.map((size) => (
                    <Chip
                      key={size.label}
                      small
                      active={selected?.size === size.value}
                      onClick={() => selected && updateText(selected.id, { size: size.value })}
                    >
                      {size.label}
                    </Chip>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Chip
                    small
                    aria-label="Bold"
                    active={!!selected?.bold}
                    onClick={() => selected && updateText(selected.id, { bold: !selected.bold })}
                  >
                    <Bold size={15} />
                  </Chip>
                  <Chip
                    small
                    aria-label="Italic"
                    active={!!selected?.italic}
                    onClick={() => selected && updateText(selected.id, { italic: !selected.italic })}
                  >
                    <Italic size={15} />
                  </Chip>
                  <button
                    type="button"
                    aria-label="Delete text"
                    onClick={removeText}
                    className="flex size-8 items-center justify-center rounded-full text-red-400 transition-colors hover:bg-red-500/15"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <nav
          className="mx-auto flex w-full max-w-2xl justify-around border-t border-white/10 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
          aria-label="Editing tools"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "flex min-w-16 flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors",
                tab === item.id ? "text-brand" : "text-white/60 hover:text-white"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

function Chip({
  active,
  small,
  children,
  className,
  ...props
}: {
  active: boolean;
  small?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors",
        small ? "h-8 min-w-8 px-2.5" : "h-9 px-4",
        active ? "bg-brand text-white" : "bg-white/10 text-white/80 hover:bg-white/20",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-3 py-1 text-sm text-white/80">
      <span className="w-24 shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={200}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onDoubleClick={() => onChange(100)}
        className="h-8 flex-1 accent-brand"
      />
      <span className="w-10 shrink-0 text-right tabular-nums text-white/60">{value - 100 > 0 ? "+" : ""}{value - 100}</span>
    </label>
  );
}

export default CropMediaInterface;
