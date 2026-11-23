"use client";

import { type ReactNode, useEffect } from "react";

import { useCachedMedia } from "@/hooks/useCachedMedia";
import type { MediaKind } from "@/lib/mediaCache";

/**
 * Render-prop wrapper around `useCachedMedia`, for places that render files inside `.map()`
 * where hooks can't be called. `save="on-mount"` stores the file as soon as it is shown (use it
 * where the user deliberately opened the file); the default only reads an existing copy.
 */
export function CachedMedia({
  url,
  kind,
  save = "never",
  children,
}: {
  url: string | undefined;
  kind: MediaKind;
  save?: "never" | "on-mount";
  children: (src: string, cacheInBackground: () => void) => ReactNode;
}) {
  const { src, cacheInBackground } = useCachedMedia(url, kind);

  useEffect(() => {
    if (save === "on-mount") cacheInBackground();
  }, [save, cacheInBackground]);

  return <>{children(src, cacheInBackground)}</>;
}
