import { useEffect, useRef } from "react";

/** How far (px) a message must be dragged before letting go quotes it. */
export const SWIPE_THRESHOLD = 56;
const MAX_PULL = 84;
/** Ignore touches this close to the left edge: browsers use that edge for "go back". */
const EDGE_GUARD = 24;
/** Things that have their own horizontal gestures; a swipe starting on them is theirs. */
const OWN_GESTURE = "input, textarea, audio, video, [role='slider'], [data-no-swipe]";

/** True if `node` (or something between it and `root`) scrolls sideways, like a wide code block. */
function scrollsSideways(node: HTMLElement | null, root: HTMLElement): boolean {
  for (let el = node; el && el !== root; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowX)) {
      return true;
    }
  }
  return false;
}

/**
 * Swipe a message to the right to reply to (quote) it.
 *
 * Attach `rowRef` to the message row and `iconRef` to a reply icon inside it. The row follows the
 * finger with some resistance, the icon fades in, and letting go past the threshold calls
 * `onTrigger`. Vertical scrolling is untouched: the gesture only starts when the movement is
 * mostly sideways. Works for touch only; on a desktop the message menu has "Quote".
 */
export function useSwipeToReply({
  enabled,
  onTrigger,
}: {
  enabled: boolean;
  onTrigger: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const trigger = useRef(onTrigger);
  useEffect(() => {
    trigger.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row || !enabled) return;

    let startX = 0;
    let startY = 0;
    let mode: "idle" | "pending" | "swiping" | "scrolling" = "idle";
    let pulled = 0;
    let armed = false;

    const paint = (distance: number, animate: boolean) => {
      row.style.transition = animate ? "transform 180ms ease-out" : "none";
      row.style.transform = distance ? `translateX(${distance}px)` : "";
      const icon = iconRef.current;
      if (icon) {
        const progress = Math.min(distance / SWIPE_THRESHOLD, 1);
        icon.style.transition = animate ? "opacity 180ms, transform 180ms" : "none";
        icon.style.opacity = String(progress);
        icon.style.transform = `translateY(-50%) scale(${0.6 + 0.4 * progress})`;
      }
    };

    const onStart = (event: TouchEvent) => {
      mode = "idle";
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const target = event.target as HTMLElement | null;
      if (touch.clientX < EDGE_GUARD) return;
      if (target?.closest(OWN_GESTURE) || scrollsSideways(target, row)) return;
      startX = touch.clientX;
      startY = touch.clientY;
      pulled = 0;
      armed = false;
      mode = "pending";
    };

    const onMove = (event: TouchEvent) => {
      if (mode === "idle" || mode === "scrolling") return;
      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (mode === "pending") {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          mode = "scrolling"; // a normal vertical scroll: leave it alone
          return;
        }
        if (dx > 12 && dx > Math.abs(dy) * 1.5) mode = "swiping";
        else return;
      }

      // Take over from the browser's own scrolling now that this is clearly a sideways swipe.
      if (event.cancelable) event.preventDefault();
      const past = Math.max(dx - SWIPE_THRESHOLD, 0);
      pulled = Math.min(dx <= 0 ? 0 : Math.min(dx, SWIPE_THRESHOLD) + past * 0.3, MAX_PULL);
      if (!armed && pulled >= SWIPE_THRESHOLD) {
        armed = true;
        navigator.vibrate?.(8);
      } else if (armed && pulled < SWIPE_THRESHOLD) {
        armed = false;
      }
      paint(pulled, false);
    };

    const onEnd = () => {
      if (mode === "swiping") {
        const done = pulled >= SWIPE_THRESHOLD;
        paint(0, true);
        if (done) trigger.current();
        // The finger lifting must not also count as a tap on the message.
        const swallow = (event: Event) => event.stopPropagation();
        row.addEventListener("click", swallow, { capture: true, once: true });
        window.setTimeout(() => row.removeEventListener("click", swallow, true), 350);
      }
      mode = "idle";
      pulled = 0;
    };

    row.addEventListener("touchstart", onStart, { passive: true });
    // Not passive: stopping the page from scrolling sideways needs preventDefault.
    row.addEventListener("touchmove", onMove, { passive: false });
    row.addEventListener("touchend", onEnd);
    row.addEventListener("touchcancel", onEnd);
    return () => {
      row.removeEventListener("touchstart", onStart);
      row.removeEventListener("touchmove", onMove);
      row.removeEventListener("touchend", onEnd);
      row.removeEventListener("touchcancel", onEnd);
      paint(0, false);
    };
  }, [enabled]);

  return { rowRef, iconRef };
}
