"use client";

/* eslint-disable @next/next/no-img-element */
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CachedMedia } from "@/components/chat/CachedMedia";
import { DocCard } from "@/components/DocCard";
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import {
  FullscreenSheet,
  FullscreenSheetClose,
  FullscreenSheetContent,
  FullscreenSheetDescription,
  FullscreenSheetTitle,
  SheetIconButton,
} from "@/components/ui/fullscreen-sheet";
import { downloadFile } from "@/lib/downloadFile";
import type { Attachment } from "@/lib/types/type";
import { cn, formatFileSize } from "@/lib/utils";

type MediaViewerProps = {
  files: Attachment[];
  open: boolean;
  /** The file to show first when the viewer opens. */
  index: number;
  onOpenChange: (open: boolean) => void;
};

/**
 * Full-screen viewer for chat images, videos and files.
 *
 * Phones: swipe between files, tap the picture to hide or show the bars, pinch-free and
 * dialog-free (it is the whole screen, with notch and home-indicator padding). Larger screens:
 * the same, plus arrow buttons, ← / → keys, and a thumbnail strip to jump around.
 */
export function MediaViewer({ files, open, index, onOpenChange }: MediaViewerProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(index);
  const [showBars, setShowBars] = useState(true);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const count = files.length;
  const active = files[current];

  useEffect(() => {
    if (!api) return;
    api.scrollTo(Math.min(index, Math.max(count - 1, 0)), true);
  }, [api, index, count]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  // Arrow keys work anywhere in the viewer, not only while the carousel has focus.
  useEffect(() => {
    if (!open || !api) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|VIDEO|AUDIO)$/.test(target.tagName)) return;
      if (event.key === "ArrowLeft") api.scrollPrev();
      else if (event.key === "ArrowRight") api.scrollNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, api]);

  useEffect(() => {
    thumbRefs.current[current]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [current]);

  const toggleBars = useCallback(() => setShowBars((prev) => !prev), []);
  const hasMany = count > 1;

  return (
    <FullscreenSheet open={open} onOpenChange={onOpenChange}>
      <FullscreenSheetContent className="bg-black">
        <FullscreenSheetDescription className="sr-only">
          {hasMany ? `File ${current + 1} of ${count}` : "File preview"}
        </FullscreenSheetDescription>

        {/* Top bar floats over the picture so it can use the whole screen. */}
        <header
          className={cn(
            "absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-black/80 to-transparent px-2 pb-6 pt-[max(0.5rem,env(safe-area-inset-top))] transition-opacity duration-200",
            !showBars && "pointer-events-none opacity-0"
          )}
        >
          <FullscreenSheetClose asChild>
            <SheetIconButton aria-label="Close">
              <X size={22} />
            </SheetIconButton>
          </FullscreenSheetClose>
          <div className="min-w-0 flex-1">
            <FullscreenSheetTitle className="truncate text-sm font-medium">
              {active?.name || "Preview"}
            </FullscreenSheetTitle>
            <p className="truncate text-xs text-white/60">
              {hasMany ? `${current + 1} of ${count}` : null}
              {hasMany && active?.size ? " · " : null}
              {active?.size ? formatFileSize(active.size) : null}
            </p>
          </div>
          <SheetIconButton
            aria-label="Download"
            disabled={!active}
            onClick={() => active && downloadFile(active.url || "", active.name)}
          >
            <Download size={20} />
          </SheetIconButton>
        </header>

        <Carousel setApi={setApi} opts={{ startIndex: index }} className="absolute inset-0">
          <CarouselContent className="ml-0 h-dvh">
            {files.map((file, key) => {
              const isImage = file.type?.startsWith("image/");
              const isVideo = file.type?.startsWith("video/");
              const isActive = key === current;
              return (
                <CarouselItem key={`${key}-${file.name}`} className="flex h-full items-center justify-center pl-0">
                  {isImage ? (
                    <CachedMedia url={file.url} kind="image" save={isActive ? "on-mount" : "never"}>
                      {(src) => (
                        <button
                          type="button"
                          onClick={toggleBars}
                          aria-label="Show or hide controls"
                          className="flex size-full cursor-default items-center justify-center p-0 sm:px-16"
                        >
                          <img
                            src={src}
                            alt={file.name}
                            draggable={false}
                            className="max-h-full max-w-full select-none object-contain"
                          />
                        </button>
                      )}
                    </CachedMedia>
                  ) : isVideo ? (
                    // Only the visible video exists, so swiping away stops playback.
                    isActive ? (
                      <CachedMedia url={file.url} kind="video" save="on-mount">
                        {(src) => (
                          <video
                            key={src}
                            src={src}
                            controls
                            playsInline
                            autoPlay
                            className="max-h-full max-w-full bg-black sm:px-16"
                          />
                        )}
                      </CachedMedia>
                    ) : null
                  ) : (
                    <DocCard className="w-auto max-w-[90%]" file={file} />
                  )}
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>

        {hasMany && (
          <>
            <SheetIconButton
              aria-label="Previous"
              onClick={() => api?.scrollPrev()}
              disabled={current === 0}
              className={cn(
                "absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 bg-black/50 backdrop-blur-sm transition-opacity sm:flex",
                !showBars && "pointer-events-none opacity-0"
              )}
            >
              <ChevronLeft size={24} />
            </SheetIconButton>
            <SheetIconButton
              aria-label="Next"
              onClick={() => api?.scrollNext()}
              disabled={current === count - 1}
              className={cn(
                "absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 bg-black/50 backdrop-blur-sm transition-opacity sm:flex",
                !showBars && "pointer-events-none opacity-0"
              )}
            >
              <ChevronRight size={24} />
            </SheetIconButton>
          </>
        )}

        {/* Thumbnails: on phones swiping is enough, so the strip is for larger screens only. */}
        {hasMany && (
          <footer
            className={cn(
              "absolute inset-x-0 bottom-0 z-10 hidden bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8 transition-opacity duration-200 sm:block",
              !showBars && "pointer-events-none opacity-0"
            )}
          >
            <div className="flex overflow-x-auto">
              <div className="mx-auto flex gap-2">
                {files.map((file, key) => (
                  <button
                    key={`${key}-${file.name}-thumb`}
                    ref={(el) => {
                      thumbRefs.current[key] = el;
                    }}
                    type="button"
                    aria-label={`Show ${file.name}`}
                    aria-current={key === current}
                    onClick={() => api?.scrollTo(key)}
                    className={cn(
                      "size-14 shrink-0 overflow-hidden rounded-lg border-2 bg-zinc-800 transition",
                      key === current ? "border-brand" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    {file.type?.startsWith("image/") ? (
                      <CachedMedia url={file.url} kind="image">
                        {(src) => <img src={src} alt="" className="size-full object-cover" />}
                      </CachedMedia>
                    ) : (
                      <span className="flex size-full items-center justify-center text-[10px] font-semibold text-white/80">
                        {file.type?.startsWith("video/") ? "VIDEO" : (file.name.split(".").pop() ?? "").toUpperCase().slice(0, 4)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </footer>
        )}
      </FullscreenSheetContent>
    </FullscreenSheet>
  );
}
