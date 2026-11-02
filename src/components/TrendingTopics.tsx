"use client";

import Link from "next/link";
import { useEffect, useId, useSyncExternalStore } from "react";

import { TREND_MAX_LIMIT, TREND_SIDEBAR_LIMIT } from "@/lib/trends";
import {
  getServerTrendsState,
  getTrendsState,
  refreshTrends,
  subscribeTrends,
} from "@/lib/trendsClient";

export default function TrendingTopics({ variant = "sidebar" }: { variant?: "sidebar" | "page" }) {
  const { snapshot, loading, error } = useSyncExternalStore(
    subscribeTrends,
    getTrendsState,
    getServerTrendsState
  );
  const headingId = useId();
  const limit = variant === "sidebar" ? TREND_SIDEBAR_LIMIT : TREND_MAX_LIMIT;
  const trends = snapshot?.data.slice(0, limit) ?? [];

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

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-800"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-semibold">
          Trending
        </h2>
        {variant === "sidebar" && (
          <Link
            href="/trending"
            className="text-sm text-brand transition-colors hover:text-brand/80"
          >
            See All
          </Link>
        )}
      </div>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Public conversations in the last 24 hours
      </p>
      {loading && !snapshot && (
        <div role="status" aria-label="Loading trends" className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} aria-hidden="true" className="animate-pulse space-y-2">
              <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-1/3 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
          ))}
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
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No trending conversations yet. Hashtags appear when at least three people post about them.
        </p>
      )}
      {trends.length > 0 && (
        <ol className="space-y-1">
          {trends.map((trend, index) => (
            <li key={trend.tag}>
              <Link
                href={`/hashtag/${encodeURIComponent(trend.tag)}`}
                className="block min-w-0 rounded-lg px-2 py-3 transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-brand dark:hover:bg-zinc-700"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">{index + 1} · Trending</p>
                <p className="truncate text-sm font-semibold">#{trend.tag}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {trend.postCount.toLocaleString("en-US")}{" "}
                  {trend.postCount === 1 ? "post" : "posts"} ·{" "}
                  {trend.authorCount.toLocaleString("en-US")} people
                </p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
