"use client";

import { useCallback, useEffect, useRef } from "react";

export const STATUS_PATH = "/status";

/*
 * While a status is on screen (viewing or adding one) the address bar reads /status. That gives the
 * browser's Back button, the phone's back gesture and the viewer's own close actions one meaning:
 * leave the status. The page underneath stays mounted, so closing returns to exactly where the
 * person was.
 *
 * Several pieces can want the entry at once (the viewer, the composer), and React's dev-mode double
 * mount runs the effect twice, so the entry is shared and only given up once nobody wants it.
 */
let owners = 0;
let entryPushed = false;
let releaseTimer: ReturnType<typeof setTimeout> | undefined;

function acquire() {
  owners += 1;
  clearTimeout(releaseTimer);
  if (entryPushed || typeof window === "undefined") return;
  window.history.pushState({ veloStatus: true }, "", STATUS_PATH);
  entryPushed = true;
}

function release() {
  owners -= 1;
  if (owners > 0) return;
  // Deferred, so an immediate re-acquire (a remount) keeps the same entry.
  releaseTimer = setTimeout(() => {
    if (owners > 0 || !entryPushed) return;
    entryPushed = false;
    if (window.location.pathname === STATUS_PATH) window.history.back();
  }, 0);
}

/** Test hook: forget any entry left over from another test. */
export function resetStatusRoute() {
  owners = 0;
  entryPushed = false;
  clearTimeout(releaseTimer);
}

/**
 * Puts /status in the address bar while `active`, and calls `onClose` when the person navigates
 * back. Returns `close`: call it for every in-app way out (the X button, a drag down, the last story
 * ending). It steps back through the history, which lands in `onClose` too, so the address bar and
 * the screen never disagree.
 */
export function useStatusRoute(active: boolean, onClose: () => void): () => void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!active) return;
    acquire();
    const onPop = () => {
      entryPushed = false;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      release();
    };
  }, [active]);

  return useCallback(() => {
    if (entryPushed) window.history.back();
    else onCloseRef.current();
  }, []);
}
