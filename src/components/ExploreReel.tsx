"use client";
import { ArrowLeft, Bookmark, Heart, MessageCircle, Share2, Volume2, VolumeX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { getExplorePostsCache, setExplorePostsCache } from "@/lib/explorePostsCache";
import { submitFollowUpdate } from "@/lib/followApi";
import { fetchExplorePosts } from "@/lib/getStatus";
import {
  postPermalinkPath,
  sharePostLink,
  togglePostBookmark,
  togglePostLike,
} from "@/lib/postSocialActions";
import type { PostSchema } from "@/lib/types/type";
import { useAppDispatch } from "@/redux/hooks";
import { updatePost } from "@/redux/postsSlice";

import ShareButton from "./ShareButton";
import { renderTextWithLinks } from "./RenderTextWithLinks";
import { Statuser } from "./VerificationComponent";

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
  onToggleMute,
  currentUserId,
  onToggleLike,
  onToggleBookmark,
  onToggleFollow,
  onOpenComments,
  onShareCommitted,
  hasAccount,
}: {
  post: PostSchema;
  isActive: boolean;
  muted: boolean;
  onToggleMute: () => void;
  currentUserId?: string;
  onToggleLike: (post: PostSchema) => void;
  onToggleBookmark: (post: PostSchema) => void;
  onToggleFollow: (post: PostSchema) => void;
  onOpenComments: (post: PostSchema) => void;
  onShareCommitted: (postId: string, updates: Partial<PostSchema>) => void;
  hasAccount: boolean;
}) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [activeMediaType, setActiveMediaType] = useState<"image" | "video">("image");
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveMediaType(isImageUrl(post.Image[activeMediaIndex]) ? "image" : "video");
  }, [activeMediaIndex, post.Image]);

  // autoplay / pause: only the visible carousel item's video plays
  useEffect(() => {
    post.Image.forEach((media, i) => {
      const v = videoRefs.current[i];
      if (!v || isImageUrl(media)) return;
      if (isActive && activeMediaIndex === i) {
        v.play().catch(() => {});
      } else {
        v.pause();
        v.currentTime = 0;
      }
    });
  }, [isActive, activeMediaIndex, post.Image]);

  // sync mute across all video refs
  useEffect(() => {
    videoRefs.current.forEach((v) => {
      if (v) v.muted = muted;
    });
  }, [muted]);

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    setActiveMediaIndex(Math.round(el.scrollLeft / el.clientWidth));
    setActiveMediaType(isImageUrl(post.Image[activeMediaIndex]) ? "image" : "video");
  };

  return (
    <div className="relative size-full overflow-hidden bg-black">
      {/* horizontal media carousel */}
      <div
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        className="flex size-full snap-x snap-mandatory overflow-x-scroll"
        style={{ scrollbarWidth: "none" }}
      >
        {post.Image.map((media, i) => {
          const isImg = isImageUrl(media);
          return (
            <div key={i} data-index={i} className="relative size-full min-w-full snap-start overflow-hidden">
              {isImg ? (
                <img src={media} alt="" className="absolute inset-0 size-full object-contain" />
              ) : (
                <video
                  ref={(el) => {
                    videoRefs.current[i] = el;
                  }}
                  src={media}
                  className="absolute inset-0 size-full object-contain"
                  loop
                  playsInline
                  muted={muted}
                  preload="metadata"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* dot indicators for multi-media posts */}
      {post.Image.length > 1 && (
        <div className="absolute inset-x-0 top-4 flex justify-center gap-1.5 px-4">
          {post.Image.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 rounded-full transition-all duration-200 ${
                i === activeMediaIndex ? "w-5 bg-white" : "w-2 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}

      {/* mute toggle */}
      <button
        onClick={onToggleMute}
        className={`absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm ${activeMediaType === "image" ? "hidden" : ""}`}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* gradient: dark at bottom and very slightly at top */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 45%, rgba(0,0,0,0.2) 100%)",
        }}
      />

      {/* bottom-left: avatar + username + caption */}
      <div className="absolute bottom-5 left-4 right-20 text-white">
        <div className="mb-2 flex items-center gap-2">
          <div
            className="size-9 shrink-0 rounded-full bg-cover bg-center ring-2 ring-white"
            style={{ backgroundImage: `url(${post.DisplayPicture || "/default.jpeg"})` }}
          />
          <div>
            <p className="flex items-center gap-1 text-sm font-bold text-slate-200 dark:text-slate-200">
              {post.NameOfPoster ? post.NameOfPoster : ""}
              {post?.Verified && <Statuser className="size-4" />}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              @{post.Username ? post.Username : "username"}
            </p>
          </div>
          {(!currentUserId || String(post.UserId) !== String(currentUserId)) && (
            <button
              type="button"
              onClick={() => onToggleFollow(post)}
              className="ml-auto shrink-0 cursor-pointer rounded-full border border-white/40 px-2 py-1 text-nowrap text-sm text-white transition-all hover:border-brand hover:text-brand"
            >
              {post.IsFollowing ? "Following" : "Follow +"}
            </button>
          )}
        </div>
        {post.Caption ? (
          <p className="line-clamp-3 text-sm leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {renderTextWithLinks(post.Caption)}
          </p>
        ) : null}
      </div>

      {/* right-side action buttons */}
      <div className="absolute bottom-5 right-3 flex flex-col items-center gap-6">
        <ActionBtn
          icon={<Heart size={28} fill={post.Liked ? "currentColor" : "none"} strokeWidth={1.8} />}
          count={post.NoOfLikes}
          active={post.Liked}
          onClick={() => onToggleLike(post)}
        />
        <ActionBtn
          icon={<MessageCircle size={28} strokeWidth={1.8} />}
          count={post.NoOfComment}
          onClick={() => onOpenComments(post)}
        />
        {hasAccount ? (
          <ShareButton post={post} onShareCommitted={onShareCommitted}>
            <div className="flex cursor-pointer flex-col items-center gap-1 text-white">
              <span className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                <Share2 size={28} strokeWidth={1.8} className={post.Shared ? "text-brand" : ""} />
              </span>
              <span className="text-xs font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {formatNo(post.NoOfShares)}
              </span>
            </div>
          </ShareButton>
        ) : (
          <ActionBtn
            icon={<Share2 size={28} strokeWidth={1.8} />}
            count={post.NoOfShares}
            onClick={async () => {
              const canShare = typeof navigator !== "undefined" && Boolean(navigator.share);
              await sharePostLink(post);
              if (!canShare) {
                toast.success("Link copied");
              }
            }}
          />
        )}
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
          onClick={() => onToggleBookmark(post)}
        />
      </div>
    </div>
  );
}

// ── main reel component ────────────────────────────────────────────────────────
export default function ExploreReel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const socket = useSocket();
  const { userdata } = useUser();
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

  const patchPostInStateAndCache = useCallback((updated: PostSchema) => {
    setPosts((prev) => {
      const nextList = prev.map((p) => (p.PostID === updated.PostID ? updated : p));
      const c = getExplorePostsCache();
      if (c) {
        setExplorePostsCache({ posts: nextList, pagination: c.pagination }, { merge: true });
      }
      return nextList;
    });
  }, []);

  const patchPostFieldsInStateAndCache = useCallback(
    (postId: string, updates: Partial<PostSchema>) => {
      setPosts((prev) => {
        const nextList = prev.map((p) => (p.PostID === postId ? { ...p, ...updates } : p));
        const c = getExplorePostsCache();
        if (c) {
          setExplorePostsCache({ posts: nextList, pagination: c.pagination }, { merge: true });
        }
        return nextList;
      });
    },
    []
  );

  const onOpenComments = useCallback(
    (post: PostSchema) => {
      router.push(postPermalinkPath(post));
    },
    [router]
  );

  const requireAuth = useCallback(() => {
    if (!userdata._id) {
      router.push("/accounts/login");
      return false;
    }
    return true;
  }, [userdata._id, router]);

  const onToggleLike = useCallback(
    (post: PostSchema) => {
      if (!requireAuth()) return;
      const { next, emit } = togglePostLike(post);
      dispatch(
        updatePost({ id: post.PostID, updates: { NoOfLikes: next.NoOfLikes, Liked: next.Liked } })
      );
      socket?.emit("reactToPost", emit);
      patchPostInStateAndCache(next);
    },
    [requireAuth, dispatch, socket, patchPostInStateAndCache]
  );

  const onToggleBookmark = useCallback(
    (post: PostSchema) => {
      if (!requireAuth()) return;
      const { next, emit } = togglePostBookmark(post);
      dispatch(
        updatePost({
          id: post.PostID,
          updates: { NoOfBookmarks: next.NoOfBookmarks, Bookmarked: next.Bookmarked },
        })
      );
      socket?.emit("reactToPost", emit);
      patchPostInStateAndCache(next);
    },
    [requireAuth, dispatch, socket, patchPostInStateAndCache]
  );

  const onToggleFollow = useCallback(
    async (post: PostSchema) => {
      if (!requireAuth()) return;
      const follow = !post.IsFollowing;
      try {
        const res = await submitFollowUpdate({
          followerId: String(userdata._id),
          followedId: String(post.UserId),
          follow,
        });
        if (res.ok) {
          const next = { ...post, IsFollowing: follow };
          dispatch(updatePost({ id: post.PostID, updates: { IsFollowing: follow } }));
          patchPostInStateAndCache(next);
        }
      } catch (error) {
        console.error(error);
        toast.error("Error", { description: "Failed to follow user" });
      }
    },
    [requireAuth, userdata._id, dispatch, patchPostInStateAndCache]
  );

  // initial fetch
  useEffect(() => {
    let cancelled = false;

    const cached = getExplorePostsCache();
    if (cached?.posts?.length) {
      setPosts(cached.posts);
      setNextSkip(cached.pagination.skip + cached.pagination.limit);
      setHasMore(cached.pagination.hasMore);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    fetchExplorePosts(0)
      .then(({ data, pagination }) => {
        if (cancelled) return;
        setPosts(data);
        setNextSkip(pagination.skip + pagination.limit);
        setHasMore(pagination.hasMore);
        setExplorePostsCache({ posts: data, pagination });
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
        const merged = [...prev, ...data.filter((p) => !seen.has(String(p.PostID ?? p._id)))];
        setExplorePostsCache({ posts: merged, pagination }, { merge: true });
        return merged;
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
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <div className="size-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <>
      {/* fixed chrome — outside the scroll container so it never scrolls away */}
      <button
        onClick={() => router.back()}
        className="fixed left-4 top-4 z-50 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm"
        aria-label="Go back"
      >
        <ArrowLeft size={22} />
      </button>

      {/* scroll container */}
      <div
        ref={containerRef}
        className="h-screen w-full snap-y snap-mandatory overflow-y-scroll bg-black"
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
            <ReelSlide
              post={post}
              isActive={activeIndex === i}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              currentUserId={userdata._id}
              onToggleLike={onToggleLike}
              onToggleBookmark={onToggleBookmark}
              onToggleFollow={onToggleFollow}
              onOpenComments={onOpenComments}
              onShareCommitted={patchPostFieldsInStateAndCache}
              hasAccount={Boolean(userdata._id)}
            />
          </div>
        ))}

        {/* loading-more spinner as a snap slide */}
        {loadingMore && (
          <div className="flex h-screen w-full snap-start items-center justify-center bg-black">
            <div className="size-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          </div>
        )}
      </div>
    </>
  );
}
