"use client";

import { ArrowLeft, Bookmark, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useUser } from "@/app/providers/UserProvider";
import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import type { PaginationMeta } from "@/lib/apiPagination";
import type { PostSchema } from "@/lib/types/type";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 320;
const PAGE_LIMIT = 20;

export default function BookmarksPage() {
  const router = useRouter();
  const navigate = useNavigateWithHistory();
  const { userdata, loading: userLoading } = useUser();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [items, setItems] = useState<PostSchema[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const fetchBookmarks = useCallback(
    async (append: boolean, currentItems: PostSchema[], q: string) => {
      const skip = append ? currentItems.length : 0;
      const url = `/api/bookmarks?skip=${skip}&limit=${PAGE_LIMIT}&q=${encodeURIComponent(q)}`;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, { credentials: "include", cache: "no-store" });
        if (res.status === 401) {
          router.push("/accounts/login");
          return;
        }
        if (!res.ok) {
          setError("Could not load bookmarks.");
          if (!append) setItems([]);
          return;
        }
        const body = (await res.json()) as {
          data?: PostSchema[];
          pagination?: PaginationMeta;
        };
        const chunk = body.data ?? [];
        const nextPage = body.pagination ?? null;
        setPagination(nextPage);
        setItems((prev) => (append ? [...prev, ...chunk] : chunk));
      } catch {
        setError("Something went wrong.");
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (userLoading) return;
    if (!userdata._id) {
      router.push("/accounts/login");
      return;
    }
    void fetchBookmarks(false, [], debouncedSearch);
  }, [debouncedSearch, userdata._id, userLoading, fetchBookmarks, router]);

  const loadMore = () => {
    void fetchBookmarks(true, items, debouncedSearch);
  };

  const hasMore = Boolean(pagination?.hasMore);
  const showEmpty = !loading && !error && items.length === 0;

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
            <h1 className="text-lg font-semibold tracking-tight">Bookmarks</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Posts you&apos;ve saved</p>
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-4 pb-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              aria-hidden
            />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by caption, author, or username…"
              className={cn(
                "h-11 rounded-full border-zinc-200 bg-white pl-10 pr-10 shadow-sm dark:border-zinc-700 dark:bg-zinc-900",
                "placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-400/30 dark:focus-visible:ring-zinc-500/30"
              )}
              aria-label="Search bookmarks"
            />
            {searchInput ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setSearchInput("")}
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-2">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => void fetchBookmarks(false, [], debouncedSearch)}>
                Try again
              </Button>
            </div>
          </div>
        ) : null}

        {loading && !items.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-zinc-500">
            <Loader2 className="size-8 animate-spin text-zinc-400" />
            <span className="text-sm">Loading bookmarks…</span>
          </div>
        ) : null}

        {showEmpty ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white/60 px-6 py-20 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
              <Bookmark className="size-8 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
            </div>
            <p className="text-base font-medium text-zinc-800 dark:text-zinc-100">No bookmarks yet</p>
            <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              {debouncedSearch
                ? "Nothing matches that search. Try different words."
                : "Save posts from your feed with the bookmark icon — they’ll show up here."}
            </p>
            {!debouncedSearch ? (
              <Button asChild className="mt-6 rounded-full" variant="default">
                <Link href="/home">Go to home</Link>
              </Button>
            ) : null}
          </div>
        ) : null}

        {!loading && items.length > 0 ? (
          <ul className="flex flex-col gap-6">
            {items.map((post) => (
              <li key={post.PostID}>
                <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <PostCard postData={post} />
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {hasMore && items.length > 0 ? (
          <div className="mt-8 flex justify-center">
            <Button variant="outline" className="rounded-full px-8" disabled={loadingMore} onClick={loadMore}>
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
