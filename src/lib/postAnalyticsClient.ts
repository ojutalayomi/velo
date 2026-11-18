import type { PostAnalyticsEvent } from "./postAnalytics";

/** Resolve only local, meaningful post content; never observe the marker or a page shell. */
export function resolvePostAnalyticsTarget(marker: HTMLElement, postId: string): Element | null {
  const explicit = marker.closest("[data-post-analytics-root]");
  if (explicit) return explicit;

  const parent = marker.parentElement;
  // Active ExploreReel mounts inside the slide, beside its horizontal media scroller.
  if (
    parent?.matches(".relative.size-full.overflow-hidden") &&
    Array.from(parent.children).some(
      (child) => child.matches(".snap-x") && child.querySelector("img, video")
    )
  )
    return parent;

  // Detail mounts before the scroll container; preview mounts before the media column.
  const content = marker.nextElementSibling;
  if (!content) return null;
  // A repost renders its original content ID but credits the explicitly opened source post.
  const article = Array.from(content.querySelectorAll("article[data-id]")).find(
    (element) =>
      (element.getAttribute("data-post-analytics-id") || element.getAttribute("data-id")) === postId
  );
  if (article) return article;
  // Do not substitute an unrelated media carousel in a detail page containing comments.
  if (content.querySelector("article")) return null;
  const carousel = content.querySelector('[aria-roledescription="carousel"]');
  return carousel?.querySelector("img, video") ? carousel.parentElement : null;
}

/** Retries retain event IDs so a beacon racing an in-flight fetch is safe on the server. */
export function createPostAnalyticsTransport() {
  const pending = new Map<string, PostAnalyticsEvent>();
  const deliver = (event: PostAnalyticsEvent, terminal = false) => {
    const body = JSON.stringify(event);
    if (terminal) {
      try {
        if (
          navigator.sendBeacon?.(
            "/api/analytics/track",
            new Blob([body], {
              type: "application/json",
            })
          )
        )
          return;
      } catch {
        /* A denied/unsupported beacon falls through to keepalive. */
      }
    } else {
      pending.set(event.eventId, event);
    }
    try {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body,
        keepalive: true,
      })
        .then((response) => {
          if (response.ok || (response.status >= 400 && response.status < 500)) {
            pending.delete(event.eventId);
          }
        })
        .catch(() => {
          /* Best effort; retry outstanding events at finalization. */
        });
    } catch {
      /* Analytics must never interrupt navigation/rendering. */
    }
  };
  return {
    deliver,
    flush() {
      const outstanding = Array.from(pending.values());
      pending.clear();
      outstanding.forEach((event) => deliver(event, true));
    },
  };
}
