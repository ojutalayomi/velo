"use client";
import { Loader2, RefreshCw, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { usePosts } from "@/app/providers/PostsProvider";
import { useUser } from "@/app/providers/UserProvider";
import PostCard from "@/components/PostCard";
import StatusTray from "@/components/status/StatusTray";
import { RootState } from "@/redux/store";

import { Skeleton } from "./ui/skeleton";

const PostSkeletons = () => (
  <>
    {[...Array(6)].map((_, i) => (
      <div
        key={"uxdf" + i}
        className="m-4 flex cursor-progress flex-col space-y-3 rounded-xl bg-white p-4 shadow-md dark:bg-zinc-900"
      >
        <div className="flex items-center justify-start gap-2">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col space-y-2">
            <Skeleton className="h-4 w-16 rounded-xl" />
            <Skeleton className="h-4 w-12 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-8 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-4 w-24 rounded-xl" />
        <div className="flex items-center justify-around gap-2">
          {[...Array(4)].map((_, j) => (
            <Skeleton key={j} className="size-8" />
          ))}
        </div>
      </div>
    ))}
  </>
);

const LoadingMoreIndicator = () => (
  <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
    <Loader2 className="size-6 animate-spin" />
    <span className="text-sm">Loading more posts…</span>
  </div>
);

type FeedTab = "forYou" | "following";

const SCROLL_KEY: Record<FeedTab, string> = {
  forYou: "homeScrollPosition_forYou",
  following: "homeScrollPosition_following",
};

const TAB_KEY = "homeActiveTab";

const Homepage: React.FC = () => {
  const { userdata } = useUser();
  const router = useRouter();

  // For You feed
  const { posts, loading, error, feedHasMore, feedLoadingMore } = useSelector(
    (state: RootState) => state.posts
  );

  // Following feed
  const {
    posts: followingPosts,
    loading: followingLoading,
    error: followingError,
    feedHasMore: followingHasMore,
    feedLoadingMore: followingLoadingMore,
  } = useSelector((state: RootState) => state.followingFeed);

  const { setReload, setFollowingReload, loadMoreFeed, loadMoreFollowing } = usePosts();

  const homeRef = useRef<HTMLDivElement>(null);
  const feedSentinelRef = useRef<HTMLDivElement>(null);
  const followingSentinelRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  const [load, setLoad] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(TAB_KEY);
      if (saved === "forYou" || saved === "following") return saved;
    }
    return "forYou";
  });

  // Persist active tab
  useEffect(() => {
    localStorage.setItem(TAB_KEY, activeTab);
  }, [activeTab]);

  // Switch tab: save current scroll, restore saved scroll for new tab
  const handleTabChange = (tab: FeedTab) => {
    if (tab === activeTab) return;
    // Save current scroll
    if (homeRef.current) {
      localStorage.setItem(SCROLL_KEY[activeTab], String(homeRef.current.scrollTop));
    }
    setActiveTab(tab);
    // Restore scroll for the new tab after render
    requestAnimationFrame(() => {
      const saved = localStorage.getItem(SCROLL_KEY[tab]);
      if (homeRef.current && saved) {
        homeRef.current.scrollTo({ top: parseInt(saved), behavior: "instant" });
      } else {
        homeRef.current?.scrollTo({ top: 0, behavior: "instant" });
      }
    });
  };

  // IntersectionObserver for For You sentinel
  useEffect(() => {
    const root = homeRef.current;
    const target = feedSentinelRef.current;
    if (!root || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting && feedHasMore && !feedLoadingMore && !loading) {
          loadMoreFeed();
        }
      },
      { root, rootMargin: "200px", threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [feedHasMore, feedLoadingMore, loadMoreFeed, loading]);

  // IntersectionObserver for Following sentinel
  useEffect(() => {
    const root = homeRef.current;
    const target = followingSentinelRef.current;
    if (!root || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting && followingHasMore && !followingLoadingMore && !followingLoading) {
          loadMoreFollowing();
        }
      },
      { root, rootMargin: "200px", threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [followingHasMore, followingLoadingMore, loadMoreFollowing, followingLoading]);

  // Save scroll position on scroll
  const handleScroll = () => {
    if (homeRef.current && !loading && !load) {
      const pos = homeRef.current.scrollTop;
      scrollPositionRef.current = pos;
      localStorage.setItem(SCROLL_KEY[activeTab], String(pos));
    }
  };

  // Restore scroll position on mount
  useEffect(() => {
    const saved = localStorage.getItem(SCROLL_KEY[activeTab]);
    if (homeRef.current && saved) {
      setTimeout(() => {
        homeRef.current?.scrollTo({ top: parseInt(saved), behavior: "instant" });
      }, 100);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore scroll after loading finishes
  useEffect(() => {
    if (!loading && !load) return;
    const saved = localStorage.getItem(SCROLL_KEY[activeTab]);
    if (homeRef.current && saved) {
      setTimeout(() => {
        homeRef.current?.scrollTo({ top: parseInt(saved), behavior: "instant" });
      }, 100);
    }
  }, [loading, load, activeTab]);

  return (
    <div onScroll={handleScroll} ref={homeRef} id="home" className="dark:text-slate-200">
      <header className="sticky top-0 z-[1] w-full bg-gray-50 shadow-md dark:bg-zinc-900">
        <div
          onClick={() => userdata.name.includes("Ayomide") && setLoad(!load)}
          className="flex w-full justify-center py-3"
        >
          <h1>Velo</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border dark:border-zinc-700">
          {(["forYou", "following"] as FeedTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`relative flex-1 py-1 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "text-foreground dark:text-slate-100"
                  : "text-muted-foreground hover:text-foreground dark:hover:text-slate-200"
              }`}
            >
              {tab === "forYou" ? "For You" : "Following"}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-16 -translate-x-1/2 rounded-full bg-brand" />
              )}
            </button>
          ))}
        </div>
      </header>

      <StatusTray />

      {/* For You Feed */}
      {activeTab === "forYou" && (
        <>
          {loading || load ? (
            <PostSkeletons />
          ) : posts ? (
            posts.length > 0 ? (
              <>
                {posts.map((post) => (
                  <PostCard key={post._id} postData={post} />
                ))}
                <div ref={feedSentinelRef} className="h-px w-full" aria-hidden />
                {feedLoadingMore && <LoadingMoreIndicator />}
              </>
            ) : (
              <div className="flex h-3/4 w-full flex-col items-center justify-center p-8 text-center">
                <div className="mb-6">
                  <div className="mb-4 text-6xl">🎉</div>
                  <h1 className="mb-2 text-2xl font-bold dark:text-slate-200">Be the First!</h1>
                  <p className="mb-4 text-gray-600 dark:text-slate-400">
                    Looks like no one has posted anything yet. Why not break the ice?
                  </p>
                </div>
                <div className="mb-6 rounded-lg border-2 border-dashed border-brand/30 bg-brand/10 p-6">
                  <p className="font-medium text-brand">
                    Share your thoughts, photos, or experiences - your post could start something
                    amazing!
                  </p>
                </div>
                <button
                  onClick={() => router.push("/compose/post")}
                  className="flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-medium text-white transition-colors hover:bg-brand/90"
                >
                  <span>Create First Post</span>
                  <span>✨</span>
                </button>
              </div>
            )
          ) : (
            error && (
              <div className="flex h-3/4 w-full flex-col items-center justify-center">
                <RefreshCw className="cursor-pointer" size={30} onClick={() => setReload(true)} />
                <h1>Reload</h1>
              </div>
            )
          )}
        </>
      )}

      {/* Following Feed */}
      {activeTab === "following" && (
        <>
          {followingLoading ? (
            <PostSkeletons />
          ) : followingPosts ? (
            followingPosts.length > 0 ? (
              <>
                {followingPosts.map((post) => (
                  <PostCard key={post._id} postData={post} />
                ))}
                <div ref={followingSentinelRef} className="h-px w-full" aria-hidden />
                {followingLoadingMore && <LoadingMoreIndicator />}
              </>
            ) : (
              <div className="flex h-3/4 w-full flex-col items-center justify-center p-8 text-center">
                <div className="mb-6">
                  <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-brand/10">
                    <Users className="size-10 text-brand" />
                  </div>
                  <h1 className="mb-2 text-2xl font-bold dark:text-slate-200">Nothing here yet</h1>
                  <p className="mb-4 text-gray-600 dark:text-slate-400">
                    Follow people to see their posts here. When the people you follow post,
                    you&apos;ll see it in this tab.
                  </p>
                </div>
                <button
                  onClick={() => router.push("/explore")}
                  className="flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-medium text-white transition-colors hover:bg-brand/90"
                >
                  <span>Find people to follow</span>
                </button>
              </div>
            )
          ) : (
            followingError && (
              <div className="flex h-3/4 w-full flex-col items-center justify-center">
                <RefreshCw
                  className="cursor-pointer"
                  size={30}
                  onClick={() => setFollowingReload((r) => !r)}
                />
                <h1>Reload</h1>
              </div>
            )
          )}
        </>
      )}

      <div className="h-20 w-full bg-transparent tablets:hidden" />
    </div>
  );
};

export default Homepage;
