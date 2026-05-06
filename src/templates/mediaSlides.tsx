"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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

const MediaSlide = ({
  className,
  postData,
  isLink = false,
  ...props
}: {
  className?: string;
  postData: PostSchema;
  isLink?: boolean;
  props?: HTMLDivElement;
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const { index } = useParams() as { index: string };
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (!api || !index) return;
    api.scrollTo(parseInt(index), true);
  }, [api]);

  useEffect(() => {
    if (!api) {
      return;
    }

    // Update count and current slide position
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    // Listen for slide changes
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  // Only show controls if there are multiple media items
  useEffect(() => {
    if (postData.Image && postData.Image.length > 1) {
      setShowControls(true);
    }
  }, [postData.Image]);

  return (
    <div
      className={cn(`relative w-full flex items-center justify-center flex-1`, className)}
      {...props}
    >
      <Carousel setApi={setApi} className="size-full">
        <CarouselContent className="h-full items-center">
          {postData.Image?.map((media, index) => {
            const mediaPath = media.split("?")[0].split("#")[0];
            const imageExtensions = /\.(png|jpe?g|gif|webp|bmp|svg|tiff?|avif)([-_]\w+)?$/i;
            const imageHosts =
              /^https?:\/\/(images\.unsplash\.com|i\.imgur\.com|cdn\.pixabay\.com|lh[0-9]+\.googleusercontent\.com|pbs\.twimg\.com)/i;
            const isImage = imageExtensions.test(mediaPath) || imageHosts.test(media);
            const isHosted = !media.includes("https") && !media.startsWith("/");
            const link = `/${postData.Username}/posts/${postData.PostID}/photo/${index}`;

            return (
              <CarouselItem
                key={`${media}-${index}`}
                className="flex size-full items-center justify-center bg-primary/10"
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

        {showControls && (
          <>
            <CarouselPrevious className="left-2 hidden sm:flex" />
            <CarouselNext className="right-2 hidden sm:flex" />
          </>
        )}
      </Carousel>

      {showControls && postData.Image.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {postData.Image.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`h-1.5 rounded-full border border-black transition-all ${
                index === current - 1 && index !== 0
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            >
              <span className="sr-only">Go to slide {index + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaSlide;
