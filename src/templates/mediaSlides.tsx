"use client";
import { useParams } from "next/navigation";
import { type HTMLAttributes, useEffect, useState } from "react";

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

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp|svg|tiff?|avif)([-_]\w+)?$/i;
const IMAGE_HOSTS =
  /^https?:\/\/(images\.unsplash\.com|i\.imgur\.com|cdn\.pixabay\.com|lh[0-9]+\.googleusercontent\.com|pbs\.twimg\.com)/i;

type MediaSlideProps = HTMLAttributes<HTMLDivElement> & {
  postData: PostSchema;
  isLink?: boolean;
};

function isImageMedia(media: string) {
  const mediaPath = media.split("?")[0].split("#")[0];
  return IMAGE_EXTENSIONS.test(mediaPath) || IMAGE_HOSTS.test(media);
}

function isHostedMedia(media: string) {
  return !media.includes("https") && !media.startsWith("/");
}

const MediaSlide = ({
  className,
  postData,
  isLink = false,
  ...props
}: MediaSlideProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const { index } = useParams() as { index: string };
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const mediaItems = postData.Image ?? [];
  const showControls = mediaItems.length > 1;

  useEffect(() => {
    if (!api || !index) return;
    api.scrollTo(parseInt(index, 10), true);
  }, [api, index]);

  useEffect(() => {
    if (!api) {
      return;
    }

    const handleSelect = () => {
      setCount(api.scrollSnapList().length);
      setCurrent(api.selectedScrollSnap() + 1);
    };

    handleSelect();

    api.on("select", handleSelect);
    api.on("reInit", handleSelect);

    return () => {
      api.off("select", handleSelect);
      api.off("reInit", handleSelect);
    };
  }, [api]);

  if (mediaItems.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "group/media relative flex w-full flex-1 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950",
        className
      )}
      {...props}
    >
      <Carousel setApi={setApi} className="size-full">
        <CarouselContent className="ml-0 h-full items-center">
          {mediaItems.map((media, index) => {
            const isImage = isImageMedia(media);
            const isHosted = isHostedMedia(media);
            const link = `/${postData.Username}/posts/${postData.PostID}/photo/${index}`;

            return (
              <CarouselItem
                key={`${media}-${index}`}
                className="flex size-full items-center justify-center overflow-hidden bg-neutral-100 pl-0 dark:bg-black"
              >
                {isImage ? (
                  <ImageDiv {...(isLink ? { link } : {})} media={media} host={isHosted} />
                ) : (
                  <VideoDiv {...(isLink ? { link } : {})} media={media} host={isHosted} />
                )}
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {showControls && (
          <>
            <CarouselPrevious className="left-3 hidden size-8 border-white/30 bg-black/50 text-white opacity-0 shadow-none backdrop-blur-md transition hover:bg-black/60 disabled:pointer-events-none disabled:opacity-0 group-hover/media:opacity-100 sm:flex" />
            <CarouselNext className="right-3 hidden size-8 border-white/30 bg-black/50 text-white opacity-0 shadow-none backdrop-blur-md transition hover:bg-black/60 disabled:pointer-events-none disabled:opacity-0 group-hover/media:opacity-100 sm:flex" />
          </>
        )}
      </Carousel>

      {showControls && (
        <>
          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium leading-none text-white shadow-sm backdrop-blur-md">
            {current || 1}/{count || mediaItems.length}
          </div>

          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {mediaItems.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  "h-1.5 rounded-full bg-white/50 shadow-sm ring-1 ring-black/10 transition-all hover:bg-white/80",
                  index === current - 1 ? "w-5 bg-white" : "w-1.5"
                )}
                aria-label={`Go to slide ${index + 1}`}
              >
                <span className="sr-only">Go to slide {index + 1}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MediaSlide;
