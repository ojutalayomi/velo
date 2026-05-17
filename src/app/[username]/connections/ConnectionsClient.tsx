"use client";

import { ArrowLeft, Check, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useUser } from "@/app/providers/UserProvider";
import { Statuser } from "@/components/VerificationComponent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaginationMeta } from "@/lib/apiPagination";
import { submitFollowUpdate } from "@/lib/followApi";
import type { UserData } from "@/lib/types/user";

type ConnectionTab = "followers" | "following";

type ConnectionsResponse = {
  data?: UserData[];
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

export default function ConnectionsClient({
  username,
  initialTab,
}: {
  username: string;
  initialTab: ConnectionTab;
}) {
  const router = useRouter();
  const { userdata } = useUser();
  const viewerId = userdata?._id ? String(userdata._id) : "";

  const [activeTab, setActiveTab] = useState<ConnectionTab>(initialTab);
  const [rows, setRows] = useState<UserData[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const fetchConnections = useCallback(
    async (tab: ConnectionTab, skip: number, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setRows([]);
        setPagination(emptyPagination);
      }
      setError("");

      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(username)}/connections?type=${tab}&skip=${skip}&limit=${PAGE_LIMIT}`,
          { credentials: "include", cache: "no-store" }
        );
        const body = (await res.json().catch(() => ({}))) as ConnectionsResponse;

        if (!res.ok) {
          setError(body.message || "Could not load this list.");
          return;
        }

        const nextRows = body.data ?? [];
        setRows((prev) => (append ? [...prev, ...nextRows] : nextRows));
        setPagination(body.pagination ?? emptyPagination);
      } catch {
        setError("Could not load this list.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [username]
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    void fetchConnections(activeTab, 0);
  }, [activeTab, fetchConnections]);

  const handleTabChange = (value: string) => {
    const nextTab: ConnectionTab = value === "following" ? "following" : "followers";
    setActiveTab(nextTab);
    router.replace(`/${username}/connections?tab=${nextTab}`, { scroll: false });
  };

  const loadMore = () => {
    if (!pagination.hasMore || loadingMore) return;
    void fetchConnections(activeTab, pagination.skip + pagination.limit, true);
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

      setRows((prev) =>
        prev.map((row) =>
          String(row._id) === String(target._id) ? { ...row, isFollowing: follow } : row
        )
      );
    } catch {
      toast.error("Could not update follow status");
    } finally {
      setUpdatingId("");
    }
  };

  const emptyCopy =
    activeTab === "followers"
      ? `@${username} does not have any followers yet.`
      : `@${username} is not following anyone yet.`;

  return (
    <div className="h-screen max-h-screen w-full overflow-auto">
      <div className="sticky top-0 z-10 flex w-full items-center gap-4 px-3 py-2 backdrop-blur-lg">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="rounded-full p-1 text-gray-600 transition-colors hover:text-gray-800 dark:text-gray-100 dark:hover:text-gray-200"
        >
          <ArrowLeft className="size-7" />
        </button>
        <Link href={`/${username}`} className="min-w-0">
          <p className="truncate font-semibold dark:text-white">Connections</p>
          <p className="truncate text-sm text-gray-600 dark:text-gray-400">@{username}</p>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full backdrop-blur-lg">
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-none border-b border-gray-200 bg-transparent p-0 text-gray-600 dark:border-gray-800 dark:text-gray-400">
          <TabsTrigger
            value="followers"
            className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-gray-950 data-[state=active]:shadow-none dark:data-[state=active]:text-white"
          >
            Followers
          </TabsTrigger>
          <TabsTrigger
            value="following"
            className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-gray-950 data-[state=active]:shadow-none dark:data-[state=active]:text-white"
          >
            Following
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="divide-y divide-gray-100 dark:divide-gray-900">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
          ))
        ) : error ? (
          <div className="px-4 py-12 text-center text-sm text-gray-600 dark:text-gray-400">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-600 dark:text-gray-400">
            {emptyCopy}
          </div>
        ) : (
          rows.map((user) => {
            const rowId = String(user._id);
            const isSelf = viewerId === rowId;
            const canFollow = Boolean(viewerId) && !isSelf;
            const isUpdating = updatingId === rowId;

            return (
              <div key={rowId} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarImage src={user.displayPicture || ""} alt="" />
                    <AvatarFallback>{initials(user)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-1 font-semibold text-gray-950 dark:text-white">
                      <span className="truncate">{user.name || user.username}</span>
                      {user.verified ? <Statuser className="size-4 shrink-0" /> : null}
                    </p>
                    <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                      @{user.username}
                    </p>
                  </div>
                </Link>

                {canFollow ? (
                  <Button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleFollow(user, !user.isFollowing)}
                    className="h-9 rounded-full bg-brand px-4 text-white hover:bg-brand/90"
                  >
                    {isUpdating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : user.isFollowing ? (
                      <Check className="size-4" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    <span className="ml-2">{user.isFollowing ? "Following" : "Follow"}</span>
                  </Button>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {!loading && !error && pagination.hasMore ? (
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
    </div>
  );
}
