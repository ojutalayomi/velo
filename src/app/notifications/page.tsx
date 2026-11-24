"use client";

import {
  ArrowLeft,
  AtSign,
  Bell,
  Heart,
  Loader2,
  MessageCircle,
  Settings,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import NotificationPreferencesCard from "@/components/NotificationPreferencesCard";
import PushNotificationSettings from "@/components/PushNotificationSettings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Statuser } from "@/components/VerificationComponent";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import type { PaginationMeta } from "@/lib/apiPagination";
import {
  formatNotificationText,
  matchesNotificationTab,
  mergeNotificationGroup,
  removeActorFromGroups,
  type NotificationNewEvent,
  type NotificationRemovedEvent,
} from "@/lib/notificationGroups";
import type { NotificationGroup, NotificationTab } from "@/lib/types/type";
import { updateLiveTime } from "@/lib/utils";
import { loadFeed, saveFeed, type FeedKey } from "@/lib/feedCache";
import { useAppDispatch } from "@/redux/hooks";
import { resetUnread, setUnreadCount } from "@/redux/notificationSlice";

const PAGE_LIMIT = 30;
const TABS: { value: NotificationTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mentions", label: "Mentions" },
  { value: "verified", label: "Verified" },
];

interface NotificationListResponse {
  data?: NotificationGroup[];
  pagination?: PaginationMeta;
  unreadCount?: number;
}

interface ReadResponse {
  success?: boolean;
  unreadCount?: number;
}

function isNotificationTab(value: string): value is NotificationTab {
  return TABS.some((tab) => tab.value === value);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function NotificationIcon({ type }: { type: NotificationGroup["type"] }) {
  switch (type) {
    case "like":
      return <Heart size={18} className="shrink-0 text-red-500" aria-hidden />;
    case "comment":
      return <MessageCircle size={18} className="shrink-0 text-blue-500" aria-hidden />;
    case "follow":
      return <UserPlus size={18} className="shrink-0 text-green-500" aria-hidden />;
    case "mention":
      return <AtSign size={18} className="shrink-0 text-yellow-500" aria-hidden />;
    default:
      return <Bell size={18} className="shrink-0 text-gray-500" aria-hidden />;
  }
}

function NotificationRow({ group }: { group: NotificationGroup }) {
  const actor = group.actors[0];
  const verified = group.actors.some((item) => item.verified);

  return (
    <Link
      href={group.url}
      className={`mb-3 flex cursor-pointer items-start gap-3 rounded-lg border-l-2 bg-white p-4 shadow-md hover:bg-slate-200 dark:bg-zinc-900 dark:shadow-2xl hover:dark:bg-zinc-700 ${
        group.unread ? "border-brand" : "border-transparent"
      }`}
    >
      <div className="relative shrink-0">
        <Avatar className="size-10">
          {actor?.displayPicture ? (
            <AvatarImage src={actor.displayPicture} alt={actor.name} />
          ) : null}
          <AvatarFallback className="text-xs font-semibold">
            {initials(actor?.name ?? actor?.username ?? "")}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 dark:bg-zinc-900">
          <NotificationIcon type={group.type} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1 font-medium text-gray-800 dark:text-slate-200">
          <span>{formatNotificationText(group)}</span>
          {verified && <Statuser />}
        </p>
        {group.snippet && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-slate-400">
            “{group.snippet}”
          </p>
        )}
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-500">
          {updateLiveTime("getlivetime", group.latestAt)}
        </p>
      </div>
      {group.unread && (
        <span
          className="mt-2 size-2 shrink-0 rounded-full bg-brand"
          aria-label="Unread notification"
        />
      )}
    </Link>
  );
}

export default function NotificationPage() {
  const router = useRouter();
  const navigate = useNavigateWithHistory();
  const socket = useSocket();
  const dispatch = useAppDispatch();
  const { userdata } = useUser();
  const userId = userdata?._id ?? "";
  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const [tab, setTab] = useState<NotificationTab>("all");
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [offlineCopy, setOfflineCopy] = useState(false);

  const nextSkipRef = useRef(0);
  const requestIdRef = useRef(0);
  const tabRef = useRef<NotificationTab>("all");
  const openedAtRef = useRef(new Date().toISOString());
  const markedReadRef = useRef(false);

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  const markRead = useCallback(async () => {
    if (markedReadRef.current) return;
    markedReadRef.current = true;

    const openedAt = openedAtRef.current;

    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ before: openedAt }),
      });
      if (!response.ok) {
        markedReadRef.current = false;
        return;
      }

      const body = (await response.json()) as ReadResponse;
      if (typeof body.unreadCount === "number") dispatch(setUnreadCount(body.unreadCount));
      else dispatch(resetUnread());

      setGroups((prev) =>
        prev.map((group) =>
          group.latestAt <= openedAt ? { ...group, unread: false } : group
        )
      );
    } catch {
      // Offline: try again the next time a list loads.
      markedReadRef.current = false;
    }
  }, [dispatch]);

  const loadPage = useCallback(
    async (targetTab: NotificationTab, append: boolean): Promise<boolean> => {
      const requestId = ++requestIdRef.current;
      const skip = append ? nextSkipRef.current : 0;

      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      setOfflineCopy(false);

      try {
        const params = new URLSearchParams({
          tab: targetTab,
          skip: String(skip),
          limit: String(PAGE_LIMIT),
        });
        const response = await fetch(`/api/notifications?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.push("/accounts/login");
          return false;
        }
        if (!response.ok) throw new Error("Could not load notifications.");

        const body = (await response.json()) as NotificationListResponse;
        if (requestId !== requestIdRef.current) return false;

        const chunk = body.data ?? [];
        if (!append) {
          void saveFeed(`notifications:${targetTab}` as FeedKey, userIdRef.current, chunk, {
            ...(body.pagination as PaginationMeta),
          });
        }
        setGroups((prev) => (append ? [...prev, ...chunk] : chunk));
        nextSkipRef.current = skip + chunk.length;
        setHasMore(Boolean(body.pagination?.hasMore));
        if (typeof body.unreadCount === "number") {
          dispatch(setUnreadCount(body.unreadCount));
        }

        return true;
      } catch {
        if (requestId !== requestIdRef.current) return false;
        // Offline or the server is unreachable: show the last list this device saw.
        if (!append) {
          const saved = await loadFeed<NotificationGroup>(
            `notifications:${targetTab}` as FeedKey,
            userIdRef.current
          );
          if (requestId !== requestIdRef.current) return false;
          if (saved) {
            setGroups(saved.data);
            nextSkipRef.current = saved.data.length;
            setHasMore(false);
            setOfflineCopy(true);
            return false;
          }
        }
        if (requestId === requestIdRef.current) {
          setError(
            typeof navigator !== "undefined" && !navigator.onLine
              ? "You're offline. Notifications will load when you reconnect."
              : "Could not load notifications."
          );
          if (!append) {
            setGroups([]);
            setHasMore(false);
          }
        }
        return false;
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [dispatch, router]
  );

  useEffect(() => {
    openedAtRef.current = new Date().toISOString();
    markedReadRef.current = false;
    let cancelled = false;

    // Initial load; mark-read happens after the first page resolves so the
    // fetched rows still show their unread state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPage("all", false).then((ok) => {
      if (ok && !cancelled) markRead();
    });

    return () => {
      cancelled = true;
    };
  }, [loadPage, markRead]);

  const handleTabChange = (value: string) => {
    if (!isNotificationTab(value) || value === tabRef.current) return;

    setTab(value);
    tabRef.current = value;
    nextSkipRef.current = 0;
    setHasMore(false);
    loadPage(value, false);
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    loadPage(tabRef.current, true);
  };

  useEffect(() => {
    if (!socket) return;

    const handleNew = (payload: NotificationNewEvent) => {
      const notification = payload?.notification;
      if (!notification?.groupKey) return;

      if (typeof payload.unreadCount === "number") {
        dispatch(setUnreadCount(payload.unreadCount));
      }

      if (!matchesNotificationTab({ type: notification.type, verified: notification.actor?.verified }, tabRef.current)) {
        return;
      }

      setGroups((prev) => mergeNotificationGroup(prev, payload));
      setError(null);
    };

    const handleRemoved = (payload: NotificationRemovedEvent) => {
      if (!payload?.groupKey) return;

      if (typeof payload.unreadCount === "number") {
        dispatch(setUnreadCount(payload.unreadCount));
      }

      setGroups((prev) => removeActorFromGroups(prev, payload));
    };

    const handleConnect = () => {
      nextSkipRef.current = 0;
      loadPage(tabRef.current, false).then((ok) => {
        if (ok) void markRead();
      });
    };

    socket.on("notification:new", handleNew);
    socket.on("notification:removed", handleRemoved);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("notification:new", handleNew);
      socket.off("notification:removed", handleRemoved);
      socket.off("connect", handleConnect);
    };
  }, [dispatch, loadPage, markRead, socket]);

  const emptyMessage =
    tab === "mentions"
      ? "No mentions yet."
      : tab === "verified"
        ? "No notifications from verified accounts yet."
        : "You're all caught up.";

  return (
    <div className="h-screen max-h-screen w-full overflow-auto bg-gray-50 dark:bg-zinc-900">
      <header className="sticky top-0 z-10 flex items-center bg-white p-2 shadow-lg dark:bg-zinc-900">
        <ArrowLeft
          size={24}
          className="cursor-pointer text-gray-600 dark:text-slate-200"
          onClick={() => navigate()}
          aria-label="Go back"
        />
        <h1 className="ml-4 text-xl font-semibold dark:text-slate-200">Notifications</h1>
        <button
          type="button"
          aria-label="Notification settings"
          aria-expanded={showSettings}
          className="ml-auto rounded-full p-2 text-gray-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-zinc-800"
          onClick={() => setShowSettings((prev) => !prev)}
        >
          <Settings size={22} />
        </button>
      </header>

      {showSettings && (
        <section className="space-y-3 border-b border-zinc-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Your inbox keeps a history of activity. Push alerts and Do Not Disturb are configured
            separately below.
          </p>
          <PushNotificationSettings />
          <NotificationPreferencesCard />
        </section>
      )}

      <main className="p-4">
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            {TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {offlineCopy && !loading && (
          <p className="mt-3 text-center text-sm text-gray-500 dark:text-slate-400" role="status">
            You&apos;re offline. Showing what was saved on this device.
          </p>
        )}

        <div className="mt-4">
          {loading ? (
            <div className="space-y-3" aria-label="Loading notifications">
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="flex items-start gap-3 rounded-lg bg-white p-4 dark:bg-zinc-900">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg bg-white p-6 text-center dark:bg-zinc-900">
              <p className="text-gray-600 dark:text-slate-400">{error}</p>
              <Button className="mt-3" variant="outline" onClick={() => loadPage(tabRef.current, false)}>
                Retry
              </Button>
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center dark:bg-zinc-900">
              <Bell size={28} className="mx-auto text-gray-400 dark:text-slate-500" />
              <p className="mt-2 text-gray-600 dark:text-slate-400">{emptyMessage}</p>
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <NotificationRow key={group.groupKey} group={group} />
              ))}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    disabled={loadingMore}
                    onClick={handleLoadMore}
                    className="gap-2"
                  >
                    {loadingMore ? <Loader2 size={16} className="animate-spin" /> : null}
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
