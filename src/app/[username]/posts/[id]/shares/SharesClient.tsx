"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaginationMeta } from "@/lib/apiPagination";
import type { PostSchema } from "@/lib/types/type";

type ShareTab = "reposts" | "quotes";

type SharesResponse = {
  data?: PostSchema[];
  pagination?: PaginationMeta;
  message?: string;
};

const PAGE_LIMIT = 20;
const emptyPagination: PaginationMeta = { skip: 0, limit: PAGE_LIMIT, hasMore: false };

export default function SharesClient({
  username,
  postId,
  initialTab,
}: {
  username: string;
  postId: string;
  initialTab: ShareTab;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ShareTab>(initialTab);
  const [posts, setPosts] = useState<PostSchema[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const fetchShares = useCallback(
    async (tab: ShareTab, skip: number, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setPosts([]);
        setPagination(emptyPagination);
      }
      setError("");

      try {
        const res = await fetch(
          `/api/post/${encodeURIComponent(postId)}/shares?type=${tab}&skip=${skip}&limit=${PAGE_LIMIT}`,
          { credentials: "include", cache: "no-store" }
        );
        const body = (await res.json().catch(() => ({}))) as SharesResponse;

        if (!res.ok) {
          setError(body.message || "Could not load post shares.");
          return;
        }

        const nextPosts = body.data ?? [];
        setPosts((prev) => (append ? [...prev, ...nextPosts] : nextPosts));
        setPagination(body.pagination ?? emptyPagination);
      } catch {
        setError("Could not load post shares.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [postId]
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    void fetchShares(activeTab, 0);
  }, [activeTab, fetchShares]);

  const handleTabChange = (value: string) => {
    const nextTab: ShareTab = value === "quotes" ? "quotes" : "reposts";
    setActiveTab(nextTab);
    router.replace(`/${username}/posts/${postId}/shares?tab=${nextTab}`, { scroll: false });
  };

  const loadMore = () => {
    if (!pagination.hasMore || loadingMore) return;
    void fetchShares(activeTab, pagination.skip + pagination.limit, true);
  };

  const emptyCopy =
    activeTab === "reposts"
      ? "No one has reposted this post yet."
      : "No one has quoted this post yet.";

  return (
    <div className="h-screen max-h-screen w-full overflow-auto dark:bg-black">
      <div className="sticky top-0 z-10 flex w-full items-center gap-4 bg-white/90 px-3 py-2 backdrop-blur-lg dark:bg-black/80">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="rounded-full p-1 text-gray-600 transition-colors hover:text-gray-800 dark:text-gray-100 dark:hover:text-gray-200"
        >
          <ArrowLeft className="size-7" />
        </button>
        <div className="min-w-0">
          <p className="truncate font-semibold dark:text-white">Post shares</p>
          <p className="truncate text-sm text-gray-600 dark:text-gray-400">@{username}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-none border-b border-gray-200 bg-transparent p-0 text-gray-600 dark:border-gray-800 dark:text-gray-400">
          <TabsTrigger
            value="reposts"
            className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-brand data-[state=active]:shadow-none"
          >
            Reposts
          </TabsTrigger>
          <TabsTrigger
            value="quotes"
            className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-brand data-[state=active]:shadow-none"
          >
            Quotes
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="dark:text-slate-200">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex w-full cursor-progress flex-col space-y-3 rounded-xl bg-white p-4 shadow-md dark:bg-zinc-900"
              >
                <div className="flex items-center gap-2">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28 rounded-xl" />
                    <Skeleton className="h-3 w-20 rounded-xl" />
                  </div>
                </div>
                <Skeleton className="h-6 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-12 text-center text-sm text-gray-600 dark:text-gray-400">
            {error}
          </div>
        ) : posts.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-600 dark:text-gray-400">
            {emptyCopy}
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={post.PostID || post._id} postData={post} />
            ))}
            {pagination.hasMore ? (
              <div className="px-4 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full rounded-full"
                >
                  {loadingMore ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {loadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
