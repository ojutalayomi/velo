"use client";

import { ArrowLeft, Check, Loader2, Plus, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useUser } from "@/app/providers/UserProvider";
import PostCard from "@/components/PostCard";
import { Statuser } from "@/components/VerificationComponent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaginationMeta } from "@/lib/apiPagination";
import { submitFollowUpdate } from "@/lib/followApi";
import type { PostSchema } from "@/lib/types/type";
import type { UserData } from "@/lib/types/user";

type ShareTab = "reposts" | "quotes";

type SharesResponse = {
  data?: Array<PostSchema | UserData>;
  pagination?: PaginationMeta;
  message?: string;
};

const PAGE_LIMIT = 20;
const emptyPagination: PaginationMeta = { skip: 0, limit: PAGE_LIMIT, hasMore: false };

function initials(user: UserData) {
  const first = user.firstname?.[0] ?? user.name?.[0] ?? user.username?.[0] ?? "";
  const last = user.lastname?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

function isPost(item: PostSchema | UserData): item is PostSchema {
  return "PostID" in item;
}

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
  const { userdata } = useUser();
  const viewerId = userdata?._id ? String(userdata._id) : "";
  const [activeTab, setActiveTab] = useState<ShareTab>(initialTab);
  const [items, setItems] = useState<Array<PostSchema | UserData>>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const fetchShares = useCallback(
    async (tab: ShareTab, skip: number, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setItems([]);
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

        const nextItems = body.data ?? [];
        setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
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

  const handleFollow = async (target: UserData, follow: boolean) => {
    if (!viewerId || updatingId) return;

    setUpdatingId(String(target._id));
    try {
      const res = await submitFollowUpdate({
        followerId: viewerId,
        followedId: String(target._id),
        follow,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(body.message || "Could not update follow status");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          !isPost(item) && String(item._id) === String(target._id)
            ? { ...item, isFollowing: follow }
            : item
        )
      );
    } catch {
      toast.error("Could not update follow status");
    } finally {
      setUpdatingId("");
    }
  };

  const emptyCopy =
    activeTab === "reposts"
      ? "No one has reposted this post yet."
      : "No one has quoted this post yet.";

  return (
    <div className="h-screen max-h-screen w-full overflow-auto dark:bg-black">
      <div className="sticky top-0 z-10 flex w-full items-center justify-between gap-4 bg-white/90 px-3 py-2 backdrop-blur-lg dark:bg-black/80">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="rounded-full p-1 text-gray-600 transition-colors hover:text-gray-800 dark:text-gray-100 dark:hover:text-gray-200"
          >
            <ArrowLeft className="size-7" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-2xl font-bold dark:text-white">Post activity</p>
            <p className="truncate text-sm text-gray-600 dark:text-gray-400">@{username}</p>
          </div>
        </div>
        <SlidersHorizontal className="size-6 shrink-0 text-gray-700 dark:text-gray-100" />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-none border-b border-gray-200 bg-transparent p-0 text-gray-600 dark:border-gray-800 dark:text-gray-400">
          <TabsTrigger
            value="quotes"
            className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-brand data-[state=active]:shadow-none"
          >
            Quotes
          </TabsTrigger>
          <TabsTrigger
            value="reposts"
            className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-brand data-[state=active]:shadow-none"
          >
            Reposts
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="dark:text-slate-200">
        {loading ? (
          <div
            className={
              activeTab === "reposts"
                ? "divide-y divide-gray-100 dark:divide-gray-900"
                : "space-y-3 p-4"
            }
          >
            {Array.from({ length: activeTab === "reposts" ? 8 : 4 }).map((_, index) => (
              <div
                key={index}
                className={
                  activeTab === "reposts"
                    ? "flex items-start gap-3 px-4 py-4"
                    : "flex w-full cursor-progress flex-col space-y-3 rounded-xl bg-white p-4 shadow-md dark:bg-zinc-900"
                }
              >
                <div className="flex items-center gap-2">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28 rounded-xl" />
                    <Skeleton className="h-3 w-20 rounded-xl" />
                  </div>
                </div>
                {activeTab === "quotes" ? (
                  <>
                    <Skeleton className="h-6 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                  </>
                ) : (
                  <Skeleton className="ml-auto h-10 w-24 rounded-full" />
                )}
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-12 text-center text-sm text-gray-600 dark:text-gray-400">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-600 dark:text-gray-400">
            {emptyCopy}
          </div>
        ) : (
          <>
            {activeTab === "reposts" ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-900">
                {items
                  .filter((item): item is UserData => !isPost(item))
                  .map((user) => {
                    const rowId = String(user._id);
                    const isSelf = viewerId === rowId;
                    const canFollow = Boolean(viewerId) && !isSelf;
                    const isUpdating = updatingId === rowId;

                    return (
                      <div key={rowId} className="flex items-start gap-3 px-4 py-4">
                        <Link href={`/${user.username}`} className="shrink-0">
                          <Avatar className="size-14">
                            <AvatarImage src={user.displayPicture || ""} alt="" />
                            <AvatarFallback>{initials(user)}</AvatarFallback>
                          </Avatar>
                        </Link>
                        <Link href={`/${user.username}`} className="min-w-0 flex-1">
                          <p className="flex min-w-0 items-center gap-1 text-lg font-bold leading-tight text-gray-950 dark:text-white">
                            <span className="truncate">{user.name || user.username}</span>
                            {user.verified ? <Statuser className="size-4 shrink-0" /> : null}
                          </p>
                          <p className="truncate text-base text-gray-500 dark:text-gray-500">
                            @{user.username}
                          </p>
                          {user.bio ? (
                            <p className="mt-1 line-clamp-2 text-base text-gray-950 dark:text-gray-100">
                              {user.bio}
                            </p>
                          ) : null}
                        </Link>
                        {canFollow ? (
                          <Button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleFollow(user, !user.isFollowing)}
                            className="mt-1 h-10 shrink-0 rounded-full bg-gray-100 px-5 font-bold text-gray-950 hover:bg-gray-200 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-200"
                          >
                            {isUpdating ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : user.isFollowing ? (
                              <Check className="size-4" />
                            ) : (
                              <Plus className="size-4" />
                            )}
                            <span>{user.isFollowing ? "Following" : "Follow"}</span>
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            ) : (
              items
                .filter((item): item is PostSchema => isPost(item))
                .map((post) => <PostCard key={post.PostID || post._id} postData={post} />)
            )}
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
