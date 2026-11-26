"use client";

import { ChevronRight, Flame, RefreshCw, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useSyncExternalStore } from "react";

import { TREND_MAX_LIMIT, TREND_SIDEBAR_LIMIT } from "@/lib/trends";
import {
  getServerTrendsState,
  getTrendsState,
  refreshTrends,
  subscribeTrends,
} from "@/lib/trendsClient";

const formatCount = (n: number) => n.toLocaleString("en-US");

export default function TrendingTopics({ variant = "sidebar" }: { variant?: "sidebar" | "page" }) {
  const { snapshot, loading, error } = useSyncExternalStore(
    subscribeTrends,
    getTrendsState,
    getServerTrendsState
  );
  const headingId = useId();
  const isPage = variant === "page";
  const limit = isPage ? TREND_MAX_LIMIT : TREND_SIDEBAR_LIMIT;
  const trends = snapshot?.data.slice(0, limit) ?? [];
  const maxPosts = Math.max(1, ...trends.map((t) => t.postCount));

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") refreshTrends();
    };
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  // Snapshot is null during SSR/hydration, so a locale-dependent time can't cause a mismatch.
  const updatedAt = snapshot
    ? new Date(snapshot.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  const status = (
    <>
      {loading && !snapshot && (
        <div
          role="status"
          aria-label="Loading trends"
          className={isPage ? "space-y-2" : "space-y-4"}
        >
          {Array.from({ length: isPage ? 6 : 3 }, (_, i) =>
            isPage ? (
              <div
                key={i}
                aria-hidden="true"
                className="flex animate-pulse items-center gap-4 rounded-2xl bg-white p-4 dark:bg-zinc-900"
              >
                <div className="size-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>
            ) : (
              <div key={i} aria-hidden="true" className="animate-pulse space-y-2">
                <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-1/3 rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
            )
          )}
        </div>
      )}
      {error && (
        <div role="status" className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          <p>
            {snapshot
              ? "Couldn't refresh trends. Showing the previous list."
              : "Couldn't load trends."}
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => refreshTrends(true)}
            className="mt-1 text-brand hover:underline disabled:opacity-50"
          >
            {loading ? "Retrying…" : "Try again"}
          </button>
        </div>
      )}
      {snapshot && trends.length === 0 && (
        <div className={isPage ? "flex flex-col items-center gap-2 py-12 text-center" : ""}>
          {isPage && <TrendingUp size={32} className="text-zinc-400" />}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No trending conversations yet. Hashtags appear when at least three people post about
            them.
          </p>
        </div>
      )}
    </>
  );

  if (isPage) {
    return (
      <section aria-labelledby={headingId} className="space-y-4">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand to-brand/60 p-5 text-white shadow-xs">
          <TrendingUp
            aria-hidden
            size={120}
            strokeWidth={1.25}
            className="absolute -right-4 -top-4 opacity-15"
          />
          <h1 id={headingId} className="text-2xl font-bold">
            Trending now
          </h1>
          <p className="mt-1 max-w-[28ch] text-sm text-white/85">
            Public conversations on Velo over the last 24 hours.
          </p>
          <div className="mt-4 flex items-center gap-3 text-xs text-white/85">
            <span>{updatedAt ? `Updated ${updatedAt}` : "Updating…"}</span>
            <button
              type="button"
              disabled={loading}
              onClick={() => refreshTrends(true)}
              aria-label="Refresh trends"
              className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 font-medium transition-colors hover:bg-white/30 disabled:opacity-60"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {status}

        {trends.length > 0 && (
          <ol className="space-y-2">
            {trends.map((trend, index) => {
              const hot = index < 3;
              return (
                <li key={trend.tag}>
                  <Link
                    href={`/hashtag/${encodeURIComponent(trend.tag)}`}
                    className="group flex min-w-0 items-center gap-4 rounded-2xl bg-white p-4 shadow-xs transition-colors hover:bg-zinc-50 focus-visible:outline-solid focus-visible:outline-brand dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        hot
                          ? "bg-brand text-white"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                      aria-label={`Rank ${index + 1}`}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-base font-semibold">#{trend.tag}</span>
                        {hot && <Flame size={14} className="shrink-0 text-orange-500" />}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {formatCount(trend.postCount)} {trend.postCount === 1 ? "post" : "posts"} ·{" "}
                        {formatCount(trend.authorCount)}{" "}
                        {trend.authorCount === 1 ? "person" : "people"}
                      </span>
                      <span
                        aria-hidden
                        className="mt-2 block h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                      >
                        <span
                          className="block h-full rounded-full bg-brand/70"
                          style={{ width: `${Math.max(6, (trend.postCount / maxPosts) * 100)}%` }}
                        />
                      </span>
                    </span>
                    <ChevronRight
                      size={18}
                      className="shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl bg-white p-4 shadow-xs dark:bg-zinc-800"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-semibold">
          Trending
        </h2>
        <Link href="/trending" className="text-sm text-brand transition-colors hover:text-brand/80">
          See All
        </Link>
      </div>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Public conversations in the last 24 hours
      </p>
      {status}
      {trends.length > 0 && (
        <ol className="space-y-1">
          {trends.map((trend, index) => (
            <li key={trend.tag}>
              <Link
                href={`/hashtag/${encodeURIComponent(trend.tag)}`}
                className="block min-w-0 rounded-lg px-2 py-3 transition-colors hover:bg-gray-50 focus-visible:outline-solid focus-visible:outline-brand dark:hover:bg-zinc-700"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">{index + 1} · Trending</p>
                <p className="truncate text-sm font-semibold">#{trend.tag}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCount(trend.postCount)} {trend.postCount === 1 ? "post" : "posts"} ·{" "}
                  {formatCount(trend.authorCount)} people
                </p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
