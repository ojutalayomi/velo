"use client";
import { useParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

import ImageDiv from "@/components/imageDiv";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { PostSchema } from "@/lib/types/type";
import { cn } from "@/lib/utils";

import VideoDiv from "./videoDiv";

const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "ogg", "mkv", "avi"]);

type MediaSlidesProps = {
  className?: string;
  postData: PostSchema;
  isLink?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

const MediaSlides: React.FC<MediaSlidesProps> = ({
  className,
  postData,
  isLink = false,
  ...props
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const { index } = useParams() as { index: string };
  const [current, setCurrent] = useState(1);
  const [count, setCount] = useState(0);

  const mediaItems = useMemo(() => postData?.Image ?? [], [postData?.Image]);
  const hasMultiple = mediaItems.length > 1;

  // Jump to the slide referenced by the URL (e.g. /posts/:id/photo/:index)
  useEffect(() => {
    if (!api || !index) return;
    const target = Number.parseInt(index, 10);
    if (!Number.isNaN(target)) api.scrollTo(target, true);
  }, [api, index]);

  // Track the active slide and total count
  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    const onSelect = () => setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (!mediaItems.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative flex w-full flex-1 items-center justify-center overflow-hidden",
        className
      )}
      {...props}
    >
      <Carousel setApi={setApi} className="size-full">
        <CarouselContent className="ml-0 h-full items-center">
          {mediaItems.map((media, i) => {
            const ext = media.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
            const isImage = !VIDEO_EXTENSIONS.has(ext);
            const isHosted = !media.includes("https") && !media.startsWith("/");
            const link = `/${postData.Username}/posts/${postData.PostID}/photo/${i}`;

            return (
              <CarouselItem
                key={`${media}-${i}`}
                className="flex size-full items-center justify-center bg-neutral-100 pl-0 dark:bg-neutral-900"
              >
                {isImage ? (
                  <ImageDiv {...(isLink ? { link } : {})} media={media} host={isHosted} />
                ) : (
                  <VideoDiv media={media} host={isHosted} />
                )}
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {hasMultiple && (
          <>
            <CarouselPrevious className="left-2 hidden border-0 bg-black/50 text-white shadow-md backdrop-blur-sm hover:bg-black/70 hover:text-white md:flex md:left-4" />
            <CarouselNext className="right-2 hidden border-0 bg-black/50 text-white shadow-md backdrop-blur-sm hover:bg-black/70 hover:text-white md:flex md:right-4" />
          </>
        )}
      </Carousel>

      {hasMultiple && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-sm">
          {current} / {count}
        </div>
      )}

      {hasMultiple && (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5 px-4">
          {mediaItems.map((_, i) => {
            const isActive = i === current - 1;
            return (
              <button
                key={i}
                type="button"
                onClick={() => api?.scrollTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={isActive}
                className={cn(
                  "h-1.5 rounded-full ring-1 ring-black/20 transition-all dark:ring-white/20",
                  isActive
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/50 hover:bg-white/80"
                )}
              >
                <span className="sr-only">Go to slide {i + 1}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MediaSlides;
