"use client";
import { Play, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type HTMLAttributes, useCallback, useEffect, useRef, useState } from "react";

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

function clampRatio(ratio: number) {
  return Math.min(1.91, Math.max(0.8, ratio));
}

// Embla 8 offers no clickAllowed(); a swipe that ends over the media still
// fires a click, so block interactions when the pointer moved.
function useTapGuard() {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const isTap = useCallback(() => !movedRef.current, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const start = startRef.current;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) {
      movedRef.current = true;
    }
  }, []);

  const onPointerUp = useCallback(() => {
    startRef.current = null;
  }, []);

  const pointerProps = { onPointerDown, onPointerMove, onPointerUp };

  return { isTap, pointerProps };
}

// h-full resolves to auto against an unconstrained parent, so the aspect
// classes govern in feeds; in height-constrained grids (e.g. profile media
// tiles) the frame fills the cell and the aspect is ignored.
const frameClass =
  "relative aspect-video size-full select-none overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950";

function VideoPlayer({
  src,
  inlinePlayback,
  hasDots,
  isTap,
  onRatio,
}: {
  src: string;
  inlinePlayback: boolean;
  hasDots: boolean;
  isTap: () => boolean;
  onRatio: (ratio: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.ended) video.currentTime = 0;
      // First explicit play carries sound intent; later toggles keep the
      // user's chosen mute state.
      if (!hasStarted) {
        video.muted = false;
        setIsMuted(false);
        setHasStarted(true);
      }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [hasStarted]);

  return (
    <div className="group/frame relative size-full">
      <video
        ref={videoRef}
        src={src}
        className={cn("size-full object-cover", inlinePlayback && "cursor-pointer")}
        playsInline
        preload="metadata"
        muted={isMuted}
        onClick={() => {
          if (inlinePlayback && isTap()) togglePlay();
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(e) => {
          const { currentTime, duration } = e.currentTarget;
          if (duration > 0) setProgress((currentTime / duration) * 100);
        }}
        onLoadedMetadata={(e) => {
          const { videoWidth, videoHeight } = e.currentTarget;
          if (videoWidth && videoHeight) onRatio(clampRatio(videoWidth / videoHeight));
        }}
      />

      <div className="pointer-events-none absolute inset-0 z-10">
        <button
          type="button"
          aria-label={isPlaying ? "Pause video" : "Play video"}
          onClick={(e) => {
            e.stopPropagation();
            if (isTap()) togglePlay();
          }}
          className={cn(
            "pointer-events-auto absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/20 backdrop-blur-md",
            "motion-safe:transition-[opacity,transform] motion-safe:duration-150 motion-safe:ease-out-expo",
            isPlaying ? "pointer-events-none scale-95 opacity-0" : "opacity-100"
          )}
        >
          <Play className="size-6 translate-x-0.5 fill-current" />
        </button>

        <button
          type="button"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
          onClick={(e) => {
            e.stopPropagation();
            const video = videoRef.current;
            if (!video) return;
            video.muted = !video.muted;
            setIsMuted(video.muted);
          }}
          className="pointer-events-auto absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors duration-150 ease-out-expo hover:bg-black/60"
        >
          {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>

        <div
          className={cn(
            "absolute inset-x-2.5 h-1 hidden group-hover/frame:block overflow-hidden rounded-full bg-white/25 shadow-[0_0_2px_rgba(0,0,0,0.5)] transition-all duration-200 ease-out-expo group-hover/frame:h-1.5",
            hasDots ? "bottom-4" : "bottom-2.5"
          )}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function MediaFrame({
  media,
  index,
  postData,
  isLink,
  hasDots,
}: {
  media: string;
  index: number;
  postData: PostSchema;
  isLink: boolean;
  hasDots: boolean;
}) {
  const isImage = isImageMedia(media);
  const src = getMediaSrc(media, isHostedMedia(media));
  const link = `/${postData.Username}/posts/${postData.PostID}/photo/${index}`;
  const [ratio, setRatio] = useState<number | undefined>(undefined);
  const { isTap, pointerProps } = useTapGuard();

  const image = (
    <Image
      src={src}
      height={1200}
      width={1200}
      alt=""
      draggable={false}
      className="size-full object-cover"
      loading="lazy"
      priority={false}
      sizes="(max-width: 768px) 100vw, 600px"
      onLoad={(e) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        if (naturalWidth && naturalHeight) setRatio(clampRatio(naturalWidth / naturalHeight));
      }}
    />
  );

  return (
    <div
      className={frameClass}
      style={ratio ? { aspectRatio: `${ratio}` } : undefined}
      {...pointerProps}
    >
      {isImage ? (
        isLink ? (
          <Link
            href={link}
            className="block size-full"
            onClick={(e) => {
              if (!isTap()) e.preventDefault();
            }}
          >
            {image}
          </Link>
        ) : (
          image
        )
      ) : (
        <VideoPlayer
          src={src}
          inlinePlayback={!isLink}
          hasDots={hasDots}
          isTap={isTap}
          onRatio={setRatio}
        />
      )}
    </div>
  );
}

const ThreadsSlide = ({ className, postData, isLink = false, ...props }: ThreadsSlideProps) => {
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
      className={cn("group/media relative flex w-full flex-1 items-center justify-center", className)}
      {...props}
    >
      <Carousel setApi={setApi} className="size-full">
        <CarouselContent className="ml-0">
          {mediaItems.map((media, index) => (
            <CarouselItem key={`${media}-${index}`} className="pl-0">
              <MediaFrame
                media={media}
                index={index}
                postData={postData}
                isLink={isLink}
                hasDots={showControls}
              />
            </CarouselItem>
          ))}
        </CarouselContent>

        {showControls && (
          <>
            <CarouselPrevious className="left-2 hidden size-8 border-white/20 bg-black/45 text-white opacity-0 shadow-none backdrop-blur-md transition-[background-color,opacity,transform] duration-150 ease-out-expo hover:bg-black/60 hover:text-white disabled:pointer-events-none disabled:opacity-0 group-hover/media:opacity-100 motion-safe:active:scale-90 sm:flex" />
            <CarouselNext className="right-2 hidden size-8 border-white/20 bg-black/45 text-white opacity-0 shadow-none backdrop-blur-md transition-[background-color,opacity,transform] duration-150 ease-out-expo hover:bg-black/60 hover:text-white disabled:pointer-events-none disabled:opacity-0 group-hover/media:opacity-100 motion-safe:active:scale-90 sm:flex" />
          </>
        )}
      </Carousel>

      {showControls && (
        <div className="pointer-events-none absolute inset-x-0 bottom-1.5 z-10 flex justify-center gap-1.5">
          {mediaItems.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "pointer-events-auto h-1.5 rounded-full bg-white/50 shadow-[0_0_2px_rgba(0,0,0,0.6)] motion-safe:transition-[width,background-color] motion-safe:duration-200 motion-safe:ease-out-expo",
                index === current - 1 ? "w-4 bg-white" : "w-1.5 hover:bg-white/75"
              )}
              aria-label={`Go to slide ${index + 1} of ${count || mediaItems.length}`}
              aria-current={index === current - 1 || undefined}
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
