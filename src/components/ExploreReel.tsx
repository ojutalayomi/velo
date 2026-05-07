"use client";
import { ArrowLeft, Bookmark, Heart, MessageCircle, Share2, Volume2, VolumeX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { fetchExplorePosts } from "@/lib/getStatus";
import type { PostSchema } from "@/lib/types/type";

// ── media helpers ──────────────────────────────────────────────────────────────
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|tiff?|avif)([-_]\w+)?$/i;
const IMAGE_HOSTS =
  /^https?:\/\/(images\.unsplash\.com|i\.imgur\.com|cdn\.pixabay\.com|lh[0-9]+\.googleusercontent\.com|pbs\.twimg\.com)/i;

function isImageUrl(url: string): boolean {
  const clean = url.split("?")[0].split("#")[0];
  return IMAGE_EXT.test(clean) || IMAGE_HOSTS.test(url);
}

function formatNo(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n || 0);
}

// ── action button ──────────────────────────────────────────────────────────────
function ActionBtn({
  icon,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  count: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${active ? "text-brand" : "text-white"}`}
    >
      <span className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{icon}</span>
      <span className="text-xs font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        {formatNo(count)}
      </span>
    </button>
  );
}

// ── single reel slide ──────────────────────────────────────────────────────────
function ReelSlide({
  post,
  isActive,
  muted,
}: {
  post: PostSchema;
  isActive: boolean;
  muted: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const media = post.Image[0];
  const isImg = isImageUrl(media);

  // autoplay / pause on visibility change
  useEffect(() => {
    const v = videoRef.current;
    if (!v || isImg) return;
    if (isActive) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [isActive, isImg]);

  // sync mute state
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* media */}
      {isImg ? (
        <img src={media} alt="" className="absolute inset-0 h-full w-full object-contain" />
      ) : (
        <video
          ref={videoRef}
          src={media}
          className="absolute inset-0 h-full w-full object-contain"
          loop
          playsInline
          muted={muted}
          preload="metadata"
        />
      )}

      {/* gradient: dark at bottom and very slightly at top */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 45%, rgba(0,0,0,0.2) 100%)",
        }}
      />

      {/* bottom-left: avatar + username + caption */}
      <div className="absolute bottom-5 left-4 right-20 text-white">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="size-9 shrink-0 rounded-full bg-cover bg-center ring-2 ring-white"
            style={{ backgroundImage: `url(${post.DisplayPicture || "/default.jpeg"})` }}
          />
          <span className="font-semibold text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            @{post.Username}
          </span>
        </div>
        {post.Caption ? (
          <p className="text-sm leading-snug line-clamp-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {post.Caption}
          </p>
        ) : null}
      </div>

      {/* right-side action buttons */}
      <div className="absolute bottom-5 right-3 flex flex-col items-center gap-6">
        <ActionBtn
          icon={<Heart size={28} fill={post.Liked ? "currentColor" : "none"} strokeWidth={1.8} />}
          count={post.NoOfLikes}
          active={post.Liked}
        />
        <ActionBtn icon={<MessageCircle size={28} strokeWidth={1.8} />} count={post.NoOfComment} />
        <ActionBtn icon={<Share2 size={28} strokeWidth={1.8} />} count={post.NoOfShares} />
        <ActionBtn
          icon={
            <Bookmark
              size={28}
              fill={post.Bookmarked ? "currentColor" : "none"}
              strokeWidth={1.8}
            />
          }
          count={post.NoOfBookmarks}
          active={post.Bookmarked}
        />
      </div>
    </div>
  );
}

// ── main reel component ────────────────────────────────────────────────────────
export default function ExploreReel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const start = searchParams?.get("start") ?? null;

  const [posts, setPosts] = useState<PostSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextSkip, setNextSkip] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [scrolledToStart, setScrolledToStart] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // initial fetch
  useEffect(() => {
    let cancelled = false;
    fetchExplorePosts(0)
      .then(({ data, pagination }) => {
        if (cancelled) return;
        setPosts(data);
        setNextSkip(pagination.skip + pagination.limit);
        setHasMore(pagination.hasMore);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // scroll to start post once data is ready
  useEffect(() => {
    if (!start || scrolledToStart || posts.length === 0 || !containerRef.current) return;
    const idx = posts.findIndex((p) => (p.PostID ?? p._id) === start);
    if (idx > 0) {
      containerRef.current.scrollTo({ top: idx * window.innerHeight, behavior: "instant" });
      setActiveIndex(idx);
    }
    setScrolledToStart(true);
  }, [start, posts, scrolledToStart]);

  // IntersectionObserver per slide to track active index
  useEffect(() => {
    const container = containerRef.current;
    if (!container || posts.length === 0) return;

    const observers: IntersectionObserver[] = [];

    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) setActiveIndex(i);
        },
        { root: container, threshold: 0.6 }
      );
      obs.observe(slide);
      observers.push(obs);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, [posts]);

  // load more posts
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data, pagination } = await fetchExplorePosts(nextSkip);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => String(p.PostID ?? p._id)));
        return [...prev, ...data.filter((p) => !seen.has(String(p.PostID ?? p._id)))];
      });
      setNextSkip(pagination.skip + pagination.limit);
      setHasMore(pagination.hasMore);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextSkip]);

  // trigger loadMore when within 3 slides of the end
  useEffect(() => {
    if (posts.length > 0 && activeIndex >= posts.length - 3) {
      loadMore().catch(console.error);
    }
  }, [activeIndex, posts.length, loadMore]);

  // ── render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="size-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* fixed chrome — outside the scroll container so it never scrolls away */}
      <button
        onClick={() => router.back()}
        className="fixed top-4 left-4 z-50 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm"
        aria-label="Go back"
      >
        <ArrowLeft size={22} />
      </button>

      <button
        onClick={() => setMuted((m) => !m)}
        className="fixed top-4 right-4 z-50 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
      </button>

      {/* scroll container */}
      <div
        ref={containerRef}
        className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black"
        style={{ scrollbarWidth: "none" }}
      >
        {posts.map((post, i) => (
          <div
            key={post._id}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="h-screen w-full snap-start snap-always"
          >
            <ReelSlide post={post} isActive={activeIndex === i} muted={muted} />
          </div>
        ))}

        {/* loading-more spinner as a snap slide */}
        {loadingMore && (
          <div className="h-screen w-full snap-start flex items-center justify-center bg-black">
            <div className="size-8 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          </div>
        )}
      </div>
    </>
  );
}
