"use client";

import { ArrowLeft, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import { DEFAULT_POST_LIMIT } from "@/lib/apiPagination";
import type { PaginationMeta } from "@/lib/apiPagination";
import type { PostSchema } from "@/lib/types/type";
import { cn } from "@/lib/utils";

export type CaptionSearchFeedProps =
  | { variant: "hashtag"; tag: string }
  | { variant: "search"; queryFromUrl: string };

function buildFetchUrl(props: CaptionSearchFeedProps, skip: number): string | null {
  const limit = DEFAULT_POST_LIMIT;
  if (props.variant === "hashtag") {
    const t = props.tag.trim();
    if (!t) return null;
    const params = new URLSearchParams();
    params.set("skip", String(skip));
    params.set("limit", String(limit));
    return `/api/hashtag/${encodeURIComponent(t)}?${params.toString()}`;
  }
  const q = props.queryFromUrl.trim();
  if (!q) return null;
  const params = new URLSearchParams();
  params.set("q", q);
  params.set("skip", String(skip));
  params.set("limit", String(limit));
  return `/api/search?${params.toString()}`;
}

export function CaptionSearchFeed(props: CaptionSearchFeedProps) {
  const router = useRouter();
  const navigate = useNavigateWithHistory();

  const [items, setItems] = useState<PostSchema[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const nextSkipRef = useRef(0);

  const [searchInput, setSearchInput] = useState(
    props.variant === "search" ? props.queryFromUrl : ""
  );

  useEffect(() => {
    if (props.variant === "search") {
      setSearchInput(props.queryFromUrl);
    }
  }, [props]);

  const listKey =
    props.variant === "hashtag" ? `h:${props.tag.trim()}` : `s:${props.queryFromUrl.trim()}`;

  const title =
    props.variant === "hashtag" ? `#${props.tag.trim()}` : props.queryFromUrl.trim() || "Search";

  const parseAndApply = useCallback(
    (body: { data?: PostSchema[]; pagination?: PaginationMeta }, append: boolean) => {
      const chunk = body.data ?? [];
      const page = body.pagination ?? null;
      setPagination(page);
      if (page) {
        nextSkipRef.current = page.skip + page.limit;
      } else {
        nextSkipRef.current = append ? nextSkipRef.current + chunk.length : chunk.length;
      }
      setItems((prev) => (append ? [...prev, ...chunk] : chunk));
    },
    []
  );

  useEffect(() => {
    const url = buildFetchUrl(props, 0);
    if (!url) {
      setItems([]);
      setPagination(null);
      nextSkipRef.current = 0;
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    nextSkipRef.current = 0;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(url, { credentials: "include", cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          const text = await res.text();
          let msg = "Could not load results.";
          try {
            const j = JSON.parse(text) as { message?: string };
            if (typeof j.message === "string") msg = j.message;
          } catch {
            /* ignore */
          }
          setError(msg);
          setItems([]);
          setPagination(null);
          nextSkipRef.current = 0;
          return;
        }
        const body = (await res.json()) as {
          data?: PostSchema[];
          pagination?: PaginationMeta;
        };
        parseAndApply(body, false);
      } catch {
        if (!cancelled) {
          setError("Something went wrong.");
          setItems([]);
          setPagination(null);
          nextSkipRef.current = 0;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listKey, reloadTick, parseAndApply]);

  const loadMore = useCallback(async () => {
    const url = buildFetchUrl(props, nextSkipRef.current);
    if (!url || !pagination?.hasMore || loadingMore || loading) return;

    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetch(url, { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        setError("Could not load more.");
        return;
      }
      const body = (await res.json()) as {
        data?: PostSchema[];
        pagination?: PaginationMeta;
      };
      parseAndApply(body, true);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoadingMore(false);
    }
  }, [props, pagination?.hasMore, loadingMore, loading, parseAndApply]);

  const hasMore = Boolean(pagination?.hasMore);
  const canFetch = buildFetchUrl(props, 0) !== null;
  const showEmpty = !loading && !error && items.length === 0 && canFetch;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const retry = () => setReloadTick((t) => t + 1);

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-[#f4f6f8]/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-200/80 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {props.variant === "hashtag" ? "Posts with this hashtag" : "Posts matching your search"}
            </p>
          </div>
        </div>
        {props.variant === "search" ? (
          <div className="mx-auto max-w-2xl px-4 pb-4">
            <form onSubmit={submitSearch} className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search captions…"
                className={cn(
                  "h-11 rounded-full border-zinc-200 bg-white pl-10 pr-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900",
                  "placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-400/30 dark:focus-visible:ring-zinc-500/30"
                )}
                aria-label="Search posts"
              />
            </form>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-2">
        {props.variant === "search" && !props.queryFromUrl.trim() ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Enter a search term above, then press Enter to find posts in captions.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={retry}>
                Try again
              </Button>
            </div>
          </div>
        ) : null}

        {loading && !items.length && canFetch ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-zinc-500">
            <Loader2 className="size-8 animate-spin text-zinc-400" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : null}

        {showEmpty ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white/60 px-6 py-20 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="text-base font-medium text-zinc-800 dark:text-zinc-100">No posts found</p>
            <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              Nothing matched this {props.variant === "hashtag" ? "hashtag" : "search"} yet.
            </p>
          </div>
        ) : null}

        {!loading && items.length > 0 ? (
          <ul className="flex flex-col gap-6">
            {items.map((post) => (
              <li key={post.PostID ?? post._id}>
                <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <PostCard postData={post} />
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {hasMore && items.length > 0 ? (
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              className="rounded-full px-8"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading…
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
