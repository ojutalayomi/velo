"use client";

import { useEffect, useRef } from "react";

import { PostAnalyticsSession } from "@/lib/postAnalytics";
import {
  createPostAnalyticsTransport,
  resolvePostAnalyticsTarget,
} from "@/lib/postAnalyticsClient";

interface PostAnalyticsProps {
  postId: string;
  /** Used only to reset an exposure on identity changes; identity is resolved on the server. */
  userId?: string;
}

export default function PostAnalytics({ postId, userId }: PostAnalyticsProps) {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (
      !postId ||
      !marker ||
      typeof IntersectionObserver === "undefined" ||
      !globalThis.crypto?.randomUUID
    )
      return;

    const transport = createPostAnalyticsTransport();
    const makeSession = () =>
      new PostAnalyticsSession(
        postId,
        crypto.randomUUID(),
        transport.deliver,
        () => crypto.randomUUID(),
        performance.now()
      );
    let session = makeSession();
    let target: Element | null = null;
    let exposed = false;
    let observer: IntersectionObserver | null = null;
    let stopped = false;
    const update = () =>
      session.setExposure(
        !stopped && exposed && document.visibilityState === "visible",
        performance.now()
      );
    const resolveTarget = () => {
      const next = resolvePostAnalyticsTarget(marker, postId);
      if (next === target) return;
      observer?.disconnect();
      exposed = false;
      update();
      target = next;
      if (!target) return;
      const observedTarget = target;
      observer = new IntersectionObserver(
        (entries) => {
          if (target !== observedTarget || stopped) return;
          // Process every transition: a batched leave/re-enter must break continuity.
          for (const entry of entries) {
            exposed = entry.isIntersecting && entry.intersectionRatio >= 0.5;
            update();
          }
        },
        { threshold: [0, 0.5, 1] }
      );
      observer.observe(target);
    };
    resolveTarget();
    // Loading content can replace placeholders after this tracker mounts.
    const mutations = new MutationObserver(resolveTarget);
    if (marker.parentElement) {
      mutations.observe(marker.parentElement, { childList: true, subtree: true });
    }
    const interval = window.setInterval(() => {
      // Visibility transitions are also handled immediately, not just at this cadence.
      if (document.visibilityState !== "visible") update();
      session.tick(performance.now());
    }, 100);
    const finalize = () => {
      if (stopped) return;
      stopped = true;
      transport.flush();
      session.finalize(performance.now());
    };
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted || !stopped) return;
      // A bfcache restoration is a new exposure, not a continuation of a finalized one.
      session = makeSession();
      stopped = false;
      exposed = false;
      observer?.disconnect();
      target = null;
      resolveTarget();
    };
    document.addEventListener("visibilitychange", update);
    window.addEventListener("pagehide", finalize);
    window.addEventListener("pageshow", restore);
    return () => {
      window.clearInterval(interval);
      mutations.disconnect();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("pagehide", finalize);
      window.removeEventListener("pageshow", restore);
      finalize();
    };
  }, [postId, userId]);

  return (
    <span
      ref={markerRef}
      data-post-analytics-marker=""
      aria-hidden="true"
      style={{ display: "none" }}
    />
  );
}
