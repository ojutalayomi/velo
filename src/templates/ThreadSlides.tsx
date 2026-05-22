"use client";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type HTMLAttributes, useEffect, useState } from "react";

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

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp|svg|tiff?|avif)([-_]\w+)?$/i;
const IMAGE_HOSTS =
  /^https?:\/\/(images\.unsplash\.com|i\.imgur\.com|cdn\.pixabay\.com|lh[0-9]+\.googleusercontent\.com|pbs\.twimg\.com)/i;
const HOSTNAME = "https://s3.amazonaws.com/post-s/";

type ThreadsSlideProps = HTMLAttributes<HTMLDivElement> & {
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

function getMediaSrc(media: string, host: boolean) {
  return host ? HOSTNAME + media : media;
}

const ThreadsSlide = ({
  className,
  postData,
  isLink = false,
  ...props
}: ThreadsSlideProps) => {
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
        "group/media relative flex w-full flex-1 items-center justify-center overflow-hidden",
        className
      )}
      {...props}
    >
      <Carousel setApi={setApi} className="size-full">
        <CarouselContent className={cn("h-full items-center", showControls ? "-ml-2" : "ml-0")}>
          {mediaItems.map((media, index) => {
            const isImage = isImageMedia(media);
            const isHosted = isHostedMedia(media);
            const src = getMediaSrc(media, isHosted);
            const link = `/${postData.Username}/posts/${postData.PostID}/photo/${index}`;
            const mediaContent = isImage ? (
              <Image
                src={src}
                height={1200}
                width={1200}
                alt=""
                className="size-full object-cover"
                loading="lazy"
                priority={false}
                sizes={
                  showControls
                    ? "(max-width: 768px) 82vw, 420px"
                    : "(max-width: 768px) 100vw, 560px"
                }
              />
            ) : (
              <video
                className="size-full object-cover"
                controls
                playsInline
                preload="metadata"
                src={src}
              />
            );

            return (
              <CarouselItem
                key={`${media}-${index}`}
                className={cn(
                  "h-full min-h-0",
                  showControls ? "basis-[82%] pl-2 sm:basis-[72%]" : "basis-full pl-0"
                )}
              >
                <div className="relative flex size-full min-h-[220px] items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950">
                  {isLink ? (
                    <Link href={link} className="block size-full">
                      {mediaContent}
                    </Link>
                  ) : (
                    mediaContent
                  )}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {showControls && (
          <>
            <CarouselPrevious className="left-2 hidden size-8 border-white/30 bg-black/45 text-white opacity-0 shadow-none backdrop-blur-md transition hover:bg-black/60 disabled:pointer-events-none disabled:opacity-0 group-hover/media:opacity-100 sm:flex" />
            <CarouselNext className="right-2 hidden size-8 border-white/30 bg-black/45 text-white opacity-0 shadow-none backdrop-blur-md transition hover:bg-black/60 disabled:pointer-events-none disabled:opacity-0 group-hover/media:opacity-100 sm:flex" />
          </>
        )}
      </Carousel>

      {showControls && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1">
          {mediaItems.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "pointer-events-auto size-1.5 rounded-full bg-white/70 shadow-[0_0_1px_rgba(0,0,0,0.7)] transition",
                index === current - 1 ? "bg-white" : "bg-white/40"
              )}
              aria-label={`Go to slide ${index + 1} of ${count || mediaItems.length}`}
            >
              <span className="sr-only">Go to slide {index + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThreadsSlide;
