/* eslint-disable @next/next/no-img-element */
"use client";

import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { fetchKlipy, klipyCustomerId, KlipyItem, KlipyKind } from "@/lib/klipy";
import { cn } from "@/lib/utils";

interface Results {
  key: string;
  items: KlipyItem[];
  page: number;
  hasNext: boolean;
  error: string;
}

/** The GIF or sticker grid with its search box; lives inside the expression picker. */
export function GifPanel({
  kind,
  userId,
  onSelect,
}: {
  kind: KlipyKind;
  userId: string;
  onSelect: (pick: { kind: KlipyKind; item: KlipyItem; query: string; customerId: string }) => void;
}) {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [customerId, setCustomerId] = useState("");
  // KLIPY wants a stable id per person; a hash of the user id keeps the real one private.
  useEffect(() => {
    void klipyCustomerId(userId).then(setCustomerId);
  }, [userId]);
  const key = `${kind}|${query}`;
  const keyRef = useRef(key);
  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  // Search as the person types, but not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 400);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    if (!customerId) return;
    const controller = new AbortController();
    fetchKlipy(kind, { q: query, page: 1, customerId }, controller.signal)
      .then((page) => setResults({ key, items: page.items, page: 1, hasNext: page.hasNext, error: "" }))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === "AbortError") return;
        setResults({ key, items: [], page: 1, hasNext: false, error: error instanceof Error ? error.message : "Could not load" });
      });
    return () => controller.abort();
  }, [kind, query, customerId, key]);

  const current = results?.key === key ? results : null;

  const loadMore = useCallback(async () => {
    if (!current || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchKlipy(kind, { q: query, page: current.page + 1, customerId });
      // The person may have switched tab or search while this was loading.
      if (keyRef.current !== current.key) return;
      setResults({
        key: current.key,
        items: [...current.items, ...page.items],
        page: current.page + 1,
        hasNext: page.hasNext,
        error: "",
      });
    } catch (error) {
      setResults({ ...current, error: error instanceof Error ? error.message : "Could not load more" });
    } finally {
      setLoadingMore(false);
    }
  }, [current, customerId, kind, loadingMore, query]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Search KLIPY"
            className="pl-8"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!current ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-gray-400" />
            </div>
          ) : current.items.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">{current.error || "Nothing found"}</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                {current.items.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => {
                      onSelect({ kind, item, query, customerId });
                    }}
                    className="aspect-square overflow-hidden rounded-lg bg-gray-100 transition hover:ring-2 hover:ring-brand dark:bg-zinc-800"
                  >
                    <img
                      src={item.previewUrl ?? item.url}
                      alt={item.title || "GIF"}
                      loading="lazy"
                      className={cn("size-full", kind === "stickers" ? "object-contain p-1" : "object-cover")}
                    />
                  </button>
                ))}
              </div>
              {current.error && <p className="p-2 text-center text-xs text-red-500">{current.error}</p>}
              {current.hasNext && (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="mt-2 w-full rounded-lg bg-brand/10 py-2 text-sm font-medium text-brand hover:bg-brand/20 disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              )}
            </>
          )}
        </div>
        <p className="text-center text-[11px] text-gray-500">Powered by KLIPY</p>
    </div>
  );
}
