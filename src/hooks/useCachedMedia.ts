"use client";

import { useCallback, useEffect, useState } from "react";

import { cacheMedia, getCachedMediaUrl, type MediaKind } from "@/lib/mediaCache";

/**
 * Play or show a chat file from its offline copy when there is one.
 *
 * `src` is the network URL until a saved copy is found (a few milliseconds), then a blob: URL, so
 * nothing waits on the cache and an uncached file behaves exactly as before.
 * `cacheInBackground()` downloads and saves the file without changing `src`, so it never
 * interrupts something already playing. Call it when the user first plays/opens the file.
 */
export function useCachedMedia(url: string | undefined, kind: MediaKind) {
  const [cached, setCached] = useState<{ url: string; blob: string } | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let created: string | null = null;
    void getCachedMediaUrl(url).then((blob) => {
      if (!blob) return;
      if (cancelled) {
        URL.revokeObjectURL(blob);
        return;
      }
      created = blob;
      setCached({ url, blob });
    });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [url]);

  const isCached = !!url && cached?.url === url;
  const src = isCached ? cached.blob : (url ?? "");

  const cacheInBackground = useCallback(() => {
    if (!url || isCached) return;
    // The copy is for next time; this player keeps its current source.
    void cacheMedia(url, kind).then((blob) => {
      if (blob) URL.revokeObjectURL(blob);
    });
  }, [url, kind, isCached]);

  return { src, isCached, cacheInBackground };
}
