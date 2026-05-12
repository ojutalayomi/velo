"use client";
import { Search, Play, Layers, RefreshCw, Settings2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { usePosts } from "@/app/providers/PostsProvider";
import { useUser } from "@/app/providers/UserProvider";
import ImageContent from "@/components/imageContent";
import type { PaginationMeta } from "@/lib/apiPagination";
import {
  clearExplorePostsCache,
  getExplorePostsCache,
  setExplorePostsCache,
} from "@/lib/explorePostsCache";
import { fetchExplorePosts } from "@/lib/getStatus";
import type { PostSchema } from "@/lib/types/type";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Skeleton } from "./ui/skeleton";

// ─── media-type helper (mirrors mediaSlides.tsx logic) ───────────────────────
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|tiff?|avif)([-_]\w+)?$/i;
const IMAGE_HOSTS =
  /^https?:\/\/(images\.unsplash\.com|i\.imgur\.com|cdn\.pixabay\.com|lh[0-9]+\.googleusercontent\.com|pbs\.twimg\.com)/i;

function isImageUrl(url: string): boolean {
  const path = url.split("?")[0].split("#")[0];
  return IMAGE_EXT.test(path) || IMAGE_HOSTS.test(url);
}

// ─── grid skeleton ────────────────────────────────────────────────────────────
function GridSkeletons({ count = 12 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-none" />
      ))}
    </>
  );
}

// ─── single grid cell ─────────────────────────────────────────────────────────
function ExploreCell({ post, onClick }: { post: PostSchema; onClick: (postId: string) => void }) {
  const firstMedia = post.Image[0];
  const isImage = isImageUrl(firstMedia);
  const hasMultiple = post.Image.length > 1;

  return (
    <button
      className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 focus:outline-none"
      onClick={() => onClick(post.PostID ?? post._id)}
      aria-label="Open post"
    >
      {isImage ? (
        <img
          src={firstMedia}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <video
          src={firstMedia}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      )}

      {/* overlay icons — top-right */}
      <span className="absolute right-1.5 top-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {!isImage && <Play className="text-white" size={18} fill="white" />}
        {isImage && hasMultiple && <Layers className="text-white" size={18} />}
      </span>
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
const Explore = () => {
  const { userdata } = useUser();
  const { success, loadMoreAvatars, avatarsHasMore, avatarsLoadingMore, setReload } = usePosts();
  const router = useRouter();

  const [posts, setPosts] = useState<PostSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextSkip, setNextSkip] = useState(0);
  /** When set, status strip uses this until cleared (cache hydrate or explicit refresh). */
  const [statusStripOverride, setStatusStripOverride] = useState<string[] | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const statusStripRef = useRef<HTMLDivElement>(null);
  const lastExplorePaginationRef = useRef<PaginationMeta | null>(null);

  const statusAvatars = statusStripOverride ?? success ?? [];

  const hardReloadExplore = useCallback(() => {
    clearExplorePostsCache();
    setStatusStripOverride(null);
    setReload((x) => !x);
    setError(null);
    setLoading(true);
    fetchExplorePosts(0)
      .then(({ data, pagination }) => {
        setPosts(data);
        setNextSkip(pagination.skip + pagination.limit);
        setHasMore(pagination.hasMore);
        lastExplorePaginationRef.current = pagination;
        setExplorePostsCache({ posts: data, pagination }, { merge: false });
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [setReload]);

  // initial load — reuse cache for up to EXPLORE_CACHE_TTL_MS unless user explicitly refreshes
  useEffect(() => {
    let cancelled = false;
    const cached = getExplorePostsCache();
    if (cached?.posts?.length) {
      setPosts(cached.posts);
      setNextSkip(cached.pagination.skip + cached.pagination.limit);
      setHasMore(cached.pagination.hasMore);
      lastExplorePaginationRef.current = cached.pagination;
      if (cached.statusUrls?.length) {
        setStatusStripOverride(cached.statusUrls);
      } else {
        setStatusStripOverride(null);
      }
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    fetchExplorePosts(0)
      .then(({ data, pagination }) => {
        if (cancelled) return;
        setPosts(data);
        setNextSkip(pagination.skip + pagination.limit);
        setHasMore(pagination.hasMore);
        lastExplorePaginationRef.current = pagination;
        setExplorePostsCache({ posts: data, pagination }, { merge: false });
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // load more
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data, pagination } = await fetchExplorePosts(nextSkip);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => String(p.PostID ?? p._id)));
        const merged = [...prev, ...data.filter((p) => !seen.has(String(p.PostID ?? p._id)))];
        lastExplorePaginationRef.current = pagination;
        setExplorePostsCache({ posts: merged, pagination }, { merge: true });
        return merged;
      });
      setNextSkip(pagination.skip + pagination.limit);
      setHasMore(pagination.hasMore);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextSkip]);

  // Keep cache aligned with status strip + grid while this screen is mounted
  useEffect(() => {
    if (posts.length === 0 || !lastExplorePaginationRef.current) return;
    setExplorePostsCache(
      {
        posts,
        pagination: lastExplorePaginationRef.current,
        ...(success?.length ? { statusUrls: success } : {}),
      },
      { merge: true }
    );
  }, [posts, success]);

  // infinite scroll sentinel
  useEffect(() => {
    const root = containerRef.current;
    const target = sentinelRef.current;
    if (!root || !target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          loadMore().catch(console.error);
        }
      },
      { root, rootMargin: "200px", threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore]);

  // avatar strip pagination
  useEffect(() => {
    const strip = statusStripRef.current;
    if (!strip) return;
    const onScroll = () => {
      const nearEnd = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 24;
      if (nearEnd && avatarsHasMore && !avatarsLoadingMore) {
        loadMoreAvatars();
      }
    };
    strip.addEventListener("scroll", onScroll, { passive: true });
    return () => strip.removeEventListener("scroll", onScroll);
  }, [avatarsHasMore, avatarsLoadingMore, loadMoreAvatars]);

  return (
    <div
      ref={containerRef}
      className="bg-white h-full min-h-screen overflow-auto dark:bg-neutral-950"
    >
      {/* Header */}
      <header className="sticky top-0 bg-white dark:bg-neutral-900 dark:border-black-200 border-b border-gray-300 p-2 z-10">
        <div className="max-w-screen-sm mx-auto flex gap-2 items-center">
          <ImageContent userdata={userdata} dpOnly />
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-gray-100 dark:bg-zinc-900 dark:shadow-sm dark:shadow-slate-200 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
          <button
            type="button"
            onClick={() => hardReloadExplore()}
            className="cursor-pointer flex items-center gap-2 rounded-full p-2 shadow hover:bg-accent"
            aria-label="Refresh explore"
          >
            <RefreshCw size={18} />
          </button>
          <div className="cursor-pointer flex items-center gap-2 rounded-full p-2 shadow hover:bg-accent">
            <Settings2 size={18} />
          </div>
        </div>
      </header>

      {/* Avatar strip */}
      <div className="pre-status pl-2 m-2 overflow-x-auto" ref={statusStripRef}>
        <div className="status p-2 flex flex-nowrap items-center justify-start gap-4 w-max min-h-[52px]">
          {loading &&
            !statusAvatars.length &&
            Array.from({ length: 7 }).map((_, i) => (
              <Skeleton
                key={"uidg" + i}
                className="size-10 shrink-0 rounded-full ring-4 ring-brand"
              />
            ))}
          {!loading &&
            statusAvatars.length > 0 &&
            statusAvatars.map((status, index) => (
              <Avatar
                key={`${status}-${index}`}
                className="status-child shrink-0 border-4 border-transparent size-16 ring-4 ring-brand"
              >
                <AvatarImage src={status} />
                <AvatarFallback>
                  <Image src="/default.jpeg" alt="avatar" width={64} height={64} />
                </AvatarFallback>
              </Avatar>
            ))}
          {avatarsLoadingMore && (
            <Skeleton className="size-10 shrink-0 rounded-full ring-4 ring-brand" />
          )}
          {!loading && error && <RefreshCw size={30} />}
        </div>
      </div>

      {/* Explore Grid */}
      <main className="max-w-screen-sm mx-auto p-1">
        <div className="grid grid-cols-3 tablets:grid-cols-4 tablets1:grid-cols-5 gap-1">
          {loading ? (
            <GridSkeletons count={18} />
          ) : error ? (
            <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <RefreshCw size={28} className="cursor-pointer" onClick={() => hardReloadExplore()} />
              <span className="text-sm">Failed to load. Tap to retry.</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="col-span-3 flex flex-col items-center justify-center py-16 text-muted-foreground">
              <span className="text-sm">Nothing to explore yet.</span>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <ExploreCell
                  key={post._id}
                  post={post}
                  onClick={(postId) => router.push(`/explore/reel?start=${postId}`)}
                />
              ))}
              <div ref={sentinelRef} className="col-span-3" aria-hidden />
              {loadingMore && <GridSkeletons count={6} />}
            </>
          )}
        </div>
      </main>

      <div className="tablets:hidden h-20 w-full bg-transparent" />
    </div>
  );
};

export default Explore;
