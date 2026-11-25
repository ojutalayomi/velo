"use client";
import { Play, Layers, RefreshCw, ArrowLeft, Heart, MessageCircle, Flame, TrendingUp, Users, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { usePosts } from "@/app/providers/PostsProvider";
import { useUser } from "@/app/providers/UserProvider";
import type { PaginationMeta } from "@/lib/apiPagination";
import {
  clearExplorePostsCache,
  getExplorePostsCache,
  setExplorePostsCache,
} from "@/lib/explorePostsCache";
import { submitFollowUpdate } from "@/lib/followApi";
import { fetchExplorePeople, fetchExplorePosts, type ExplorePerson } from "@/lib/getStatus";
import { isImageUrl } from "@/lib/mediaType";
import type { ClientPostSchema } from "@/lib/types/type";
import { getServerTrendsState, getTrendsState, refreshTrends, subscribeTrends } from "@/lib/trendsClient";

import { ExploreSearchPanel } from "@/components/ExploreSearchPanel";
import { ExploreStatusRail } from "@/components/status/ExploreStatusRail";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Skeleton } from "./ui/skeleton";

// ─── grid skeleton ────────────────────────────────────────────────────────────
function GridSkeletons({ count = 12 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-lg" />
      ))}
    </>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────
type Filter = "all" | "photos" | "videos" | "popular";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "For you" },
  { id: "photos", label: "Photos" },
  { id: "videos", label: "Videos" },
  { id: "popular", label: "Popular" },
];

const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(n ?? 0);

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
      {icon}
      {children}
    </h2>
  );
}

function Stats({ post }: { post: ClientPostSchema }) {
  return (
    <span className="flex items-center gap-3 text-xs font-semibold text-white">
      <span className="flex items-center gap-1">
        <Heart size={14} fill="white" /> {compact(post.NoOfLikes)}
      </span>
      <span className="flex items-center gap-1">
        <MessageCircle size={14} fill="white" /> {compact(post.NoOfComment)}
      </span>
    </span>
  );
}

function Media({ src }: { src: string }) {
  return isImageUrl(src) ? (
    <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
  ) : (
    <video
      src={src}
      className="absolute inset-0 h-full w-full object-cover"
      muted
      playsInline
      preload="metadata"
    />
  );
}

// ─── suggested person card ────────────────────────────────────────────────────
function PersonCard({
  person,
  busy,
  onToggle,
}: {
  person: ExplorePerson;
  busy: boolean;
  onToggle: (p: ExplorePerson) => void;
}) {
  return (
    <div className="flex w-32 shrink-0 flex-col items-center gap-1 rounded-2xl bg-zinc-50 p-3 text-center dark:bg-zinc-900 tablets:w-36">
      <Link href={`/${person.username}`} className="flex flex-col items-center gap-1">
        <Avatar className="h-14 w-14">
          <AvatarImage src={person.displayPicture} />
          <AvatarFallback>{(person.name ?? person.username)?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="flex max-w-[80%] items-center gap-1 text-sm font-semibold">
          <span className="truncate">{person.name || person.username}</span>
          {person.verified && <BadgeCheck size={14} className="shrink-0 text-brand" />}
        </span>
        <span className="max-w-[80%] truncate text-xs text-muted-foreground">@{person.username}</span>
        <span className="text-[11px] text-muted-foreground">
          {compact(person.followers ?? 0)} followers
        </span>
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={() => onToggle(person)}
        className={`mt-1 w-full rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60 ${
          person.isFollowing
            ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
            : "bg-brand text-white hover:bg-brand/90"
        }`}
      >
        {person.isFollowing ? "Following" : "Follow"}
      </button>
    </div>
  );
}

// ─── hot rail card (tall, with author) ────────────────────────────────────────
function HotCard({ post, onClick }: { post: ClientPostSchema; onClick: (id: string) => void }) {
  const first = post.Image[0];
  return (
    <button
      onClick={() => onClick(post.PostID ?? post._id)}
      aria-label={`Open post by ${post.NameOfPoster}`}
      className="group relative aspect-[3/4] w-36 shrink-0 snap-start overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800 tablets:w-44"
    >
      <Media src={first} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      {!isImageUrl(first) && (
        <Play className="absolute right-2 top-2 text-white drop-shadow" size={18} fill="white" />
      )}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-2.5 text-left">
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5 ring-1 ring-white/70">
            <AvatarImage src={post.DisplayPicture} />
            <AvatarFallback className="text-[9px]">{post.NameOfPoster?.[0]}</AvatarFallback>
          </Avatar>
          <span className="truncate text-xs font-medium text-white">@{post.Username}</span>
        </div>
        <Stats post={post} />
      </div>
    </button>
  );
}

// ─── single grid cell ─────────────────────────────────────────────────────────
function ExploreCell({
  post,
  featured,
  onClick,
}: {
  post: ClientPostSchema;
  featured: boolean;
  onClick: (postId: string) => void;
}) {
  const firstMedia = post.Image[0];
  const isImage = isImageUrl(firstMedia);
  const hasMultiple = post.Image.length > 1;

  return (
    <button
      className={`group relative w-full overflow-hidden rounded-lg bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:bg-zinc-800 ${
        featured ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
      }`}
      onClick={() => onClick(post.PostID ?? post._id)}
      aria-label="Open post"
    >
      <Media src={firstMedia} />
      <span className="absolute right-1.5 top-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {!isImage && <Play className="text-white" size={18} fill="white" />}
        {isImage && hasMultiple && <Layers className="text-white" size={18} />}
      </span>
      {/* hover / focus stats */}
      <span className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        <Stats post={post} />
      </span>
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
const PAGE_SIZE = 20;
const HOT_CACHE_TTL_MS = 5 * 60 * 1000;
let hotCache: { posts: ClientPostSchema[]; at: number } | null = null;
let peopleCache: { people: ExplorePerson[]; at: number } | null = null;

const Explore = () => {
  const { success, setReload } = usePosts();
  const { userdata } = useUser();
  const viewerId = userdata?._id ? String(userdata._id) : "";
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>("all");
  const [posts, setPosts] = useState<ClientPostSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextSkip, setNextSkip] = useState(PAGE_SIZE);

  const [hotPosts, setHotPosts] = useState<ClientPostSchema[]>(() => hotCache?.posts ?? []);
  const [people, setPeople] = useState<ExplorePerson[]>(() => peopleCache?.people ?? []);
  const [followingBusy, setFollowingBusy] = useState("");

  const trendsState = useSyncExternalStore(subscribeTrends, getTrendsState, getServerTrendsState);
  const trends = trendsState.snapshot?.data.slice(0, 12) ?? [];

  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastExplorePaginationRef = useRef<PaginationMeta | null>(null);
  /** Bumped on every filter change/reload so late responses from a stale feed are dropped. */
  const feedGenRef = useRef(0);

  const applyPage = useCallback(
    (data: ClientPostSchema[], pagination: PaginationMeta, activeFilter: Filter) => {
      setPosts(data);
      setNextSkip(pagination.skip + pagination.limit);
      setHasMore(pagination.hasMore);
      lastExplorePaginationRef.current = pagination;
      // Only the default feed is cached; filtered feeds always hit the server.
      if (activeFilter === "all") setExplorePostsCache({ posts: data, pagination }, { merge: false });
      setError(null);
    },
    []
  );

  const loadFeed = useCallback(
    (activeFilter: Filter, opts: { force?: boolean } = {}) => {
      const gen = ++feedGenRef.current;
      if (activeFilter === "all" && !opts.force) {
        const cached = getExplorePostsCache();
        if (cached?.posts?.length) {
          setPosts(cached.posts);
          setNextSkip(cached.pagination.skip + cached.pagination.limit);
          setHasMore(cached.pagination.hasMore);
          lastExplorePaginationRef.current = cached.pagination;
          setLoading(false);
          setError(null);
          return;
        }
      }
      setPosts([]);
      setHasMore(false);
      setError(null);
      setLoading(true);
      fetchExplorePosts(0, PAGE_SIZE, activeFilter)
        .then(({ data, pagination }) => {
          if (gen === feedGenRef.current) applyPage(data, pagination, activeFilter);
        })
        .catch((err: Error) => {
          if (gen === feedGenRef.current) setError(err.message);
        })
        .finally(() => {
          if (gen === feedGenRef.current) setLoading(false);
        });
    },
    [applyPage]
  );

  const loadHot = useCallback((force = false) => {
    if (!force && hotCache && Date.now() - hotCache.at < HOT_CACHE_TTL_MS) return;
    fetchExplorePosts(0, 8, "hot")
      .then(({ data }) => {
        hotCache = { posts: data, at: Date.now() };
        setHotPosts(data);
      })
      .catch(() => {});
  }, []);

  const loadPeople = useCallback((force = false) => {
    if (!force && peopleCache && Date.now() - peopleCache.at < HOT_CACHE_TTL_MS) return;
    fetchExplorePeople(0, 12)
      .then(({ data }) => {
        peopleCache = { people: data, at: Date.now() };
        setPeople(data);
      })
      .catch(() => {});
  }, []);

  const hardReloadExplore = useCallback(() => {
    clearExplorePostsCache();
    setReload((x) => !x);
    loadFeed(filter, { force: true });
    loadHot(true);
    loadPeople(true);
    refreshTrends(true);
  }, [filter, loadFeed, loadHot, loadPeople, setReload]);

  // (re)load the grid whenever the filter changes
  useEffect(() => {
    loadFeed(filter);
  }, [filter, loadFeed]);

  // rails load once per mount (module-level cache avoids refetch on SPA navigation)
  useEffect(() => {
    loadHot();
    loadPeople();
    refreshTrends();
  }, [loadHot, loadPeople]);

  const togglePersonFollow = useCallback(
    async (person: ExplorePerson) => {
      if (!viewerId) {
        router.push("/login");
        return;
      }
      const follow = !person.isFollowing;
      const patch = (isFollowing: boolean) =>
        setPeople((prev) => {
          const next = prev.map((p) => (p._id === person._id ? { ...p, isFollowing } : p));
          peopleCache = { people: next, at: peopleCache?.at ?? Date.now() };
          return next;
        });
      patch(follow);
      setFollowingBusy(person._id);
      try {
        const res = await submitFollowUpdate({
          followerId: viewerId,
          followedId: person._id,
          follow,
        });
        if (!res.ok) patch(!follow);
      } catch {
        patch(!follow);
      } finally {
        setFollowingBusy("");
      }
    },
    [router, viewerId]
  );

  // load more
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    const gen = feedGenRef.current;
    const activeFilter = filter;
    setLoadingMore(true);
    try {
      const { data, pagination } = await fetchExplorePosts(nextSkip, PAGE_SIZE, activeFilter);
      if (gen !== feedGenRef.current) return;
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => String(p.PostID ?? p._id)));
        const merged = [...prev, ...data.filter((p) => !seen.has(String(p.PostID ?? p._id)))];
        lastExplorePaginationRef.current = pagination;
        if (activeFilter === "all") setExplorePostsCache({ posts: merged, pagination }, { merge: true });
        return merged;
      });
      setNextSkip(pagination.skip + pagination.limit);
      setHasMore(pagination.hasMore);
    } catch (err) {
      if (gen === feedGenRef.current) setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }, [filter, hasMore, loading, loadingMore, nextSkip]);

  // Keep cache aligned with status strip + grid while this screen is mounted
  useEffect(() => {
    if (filter !== "all" || posts.length === 0 || !lastExplorePaginationRef.current) return;
    setExplorePostsCache(
      {
        posts,
        pagination: lastExplorePaginationRef.current,
        ...(success?.length ? { statusUrls: success } : {}),
      },
      { merge: true }
    );
  }, [filter, posts, success]);

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
  }, [loadMore, posts.length]);

  return (
    <div
      ref={containerRef}
      className="bg-white h-full min-h-screen overflow-auto dark:bg-neutral-950"
    >
      {/* Header */}
      <header className="sticky top-0 bg-white dark:bg-neutral-900 dark:border-black-200 p-2 border-gray-300 z-10">
        <div className="max-w-screen-sm mx-auto flex gap-2 items-center">
          <div className="cursor-pointer flex items-center gap-2 rounded-full p-2 shadow hover:bg-accent" onClick={() => router.push("/home")} aria-label="Back to home">
            <ArrowLeft size={18}/>
          </div>
          <ExploreSearchPanel variant="explore" className="flex-1" />
          <button
            type="button"
            onClick={() => hardReloadExplore()}
            className="cursor-pointer flex items-center gap-2 rounded-full p-2 shadow hover:bg-accent"
            aria-label="Refresh explore"
          >
            <RefreshCw size={18} />
          </button>
          <Link
            href="/trending"
            className="cursor-pointer flex items-center gap-2 rounded-full p-2 shadow hover:bg-accent"
            aria-label="Trending"
          >
            <TrendingUp size={18} />
          </Link>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto p-1 pb-4">
        <ExploreStatusRail />

        {/* Trending topics rail */}
        {trends.length > 0 && (
          <section className="mb-4 mt-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <SectionTitle icon={<TrendingUp size={16} className="text-brand" />}>
                Trending now
              </SectionTitle>
              <Link href="/trending" className="mb-2 text-xs font-medium text-brand hover:underline">
                See all
              </Link>
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-1 pb-1">
              {trends.map((t) => (
                <Link
                  key={t.tag}
                  href={`/hashtag/${encodeURIComponent(t.tag)}`}
                  className="shrink-0 rounded-full bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand/20"
                >
                  #{t.tag}
                  <span className="ml-1.5 text-xs font-normal opacity-70">{compact(t.postCount)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Hot posts rail */}
        {filter === "all" && hotPosts.length >= 4 && (
          <section className="mb-4">
            <SectionTitle icon={<Flame size={16} className="text-orange-500" />}>
              Hot right now
            </SectionTitle>
            <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto px-1 pb-1">
              {hotPosts.map((post) => (
                <HotCard
                  key={post._id}
                  post={post}
                  onClick={(id) => router.push(`/explore/reel?start=${id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Suggested people rail */}
        {people.length > 0 && filter === "all" && (
          <section className="mb-4">
            <SectionTitle icon={<Users size={16} className="text-brand" />}>
              People to follow
            </SectionTitle>
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-1 pb-1">
              {people.map((person) => (
                <PersonCard
                  key={person._id}
                  person={person}
                  busy={followingBusy === person._id}
                  onToggle={togglePersonFollow}
                />
              ))}
            </div>
          </section>
        )}

        {/* Filter chips */}
        <div
          role="tablist"
          aria-label="Explore filter"
          className="no-scrollbar sticky top-[52px] z-[5] -mx-1 mb-2 flex gap-2 overflow-x-auto bg-white px-2 py-2 dark:bg-neutral-950"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.id
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Mosaic grid */}
        <div className="grid grid-flow-dense grid-cols-3 tablets:grid-cols-4 tablets1:grid-cols-5 gap-1">
          {loading ? (
            <GridSkeletons count={18} />
          ) : error ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <RefreshCw size={28} className="cursor-pointer" onClick={() => hardReloadExplore()} />
              <span className="text-sm">Failed to load. Tap to retry.</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
              <span className="text-sm">
                {filter === "all" ? "Nothing to explore yet." : "Nothing here yet. Try another filter."}
              </span>
            </div>
          ) : (
            <>
              {posts.map((post, i) => (
                <ExploreCell
                  key={post._id}
                  post={post}
                  featured={i % 10 === 0}
                  onClick={(postId) => router.push(`/explore/reel?start=${postId}`)}
                />
              ))}
              <div ref={sentinelRef} className="col-span-full" aria-hidden />
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
