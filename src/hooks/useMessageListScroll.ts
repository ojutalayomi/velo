import { RefObject, useCallback, useEffect, useRef } from "react";

/** Within this many px of the bottom counts as "at the bottom". */
export const NEAR_BOTTOM_PX = 100;
/** Start fetching/revealing older messages this far from the top, well before the user reaches it. */
export const NEAR_TOP_PX = 600;
/** Older messages are added only after scrolling has been still for this long (ms). */
export const IDLE_MS = 140;

export const isNearBottom = (box: { scrollTop: number; scrollHeight: number; clientHeight: number }) =>
  box.scrollHeight - box.scrollTop - box.clientHeight < NEAR_BOTTOM_PX;

/**
 * Scroll handling for a chat's message list, kept cheap because it runs while the finger is moving.
 *
 * - The work is done at most once per frame (requestAnimationFrame), not once per scroll event.
 * - `onNearBottomChange` fires only when the value changes, so it doesn't set state every frame.
 * - Older messages are added only once scrolling has been still for `IDLE_MS`. Changing `scrollTop`
 *   while a flick is still gliding stops the momentum on iOS (the "choppy" feel), so it must wait.
 *
 * `loadOlder` should add the older messages and keep the reading position (it is only called when
 * the list is near the top and idle). Attach the returned function as `onScroll`.
 */
export function useMessageListScroll({
  boxRef,
  atBottomRef,
  onNearBottomChange,
  loadOlder,
}: {
  boxRef: RefObject<HTMLDivElement | null>;
  atBottomRef: RefObject<boolean>;
  onNearBottomChange: (nearBottom: boolean) => void;
  loadOlder: (box: HTMLDivElement) => void;
}) {
  const latest = useRef({ onNearBottomChange, loadOlder });
  useEffect(() => {
    latest.current = { onNearBottomChange, loadOlder };
  });

  const frame = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNear = useRef<boolean | null>(null);

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    },
    []
  );

  return useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const box = boxRef.current;
      if (!box) return;
      const near = isNearBottom(box);
      atBottomRef.current = near;
      if (lastNear.current !== near) {
        lastNear.current = near;
        latest.current.onNearBottomChange(near);
      }
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = null;
      if (box.scrollTop < NEAR_TOP_PX) {
        idleTimer.current = setTimeout(() => {
          idleTimer.current = null;
          const current = boxRef.current;
          if (current && current.scrollTop < NEAR_TOP_PX) latest.current.loadOlder(current);
        }, IDLE_MS);
      }
    });
  }, [boxRef, atBottomRef]);
}
