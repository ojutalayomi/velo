"use client";

import { useSyncExternalStore } from "react";

export const PLAYBACK_RATES = [1, 1.5, 2] as const;
const KEY = "velo:audio-rate";

let rate: number = 1;
try {
  const stored = Number(localStorage.getItem(KEY));
  if ((PLAYBACK_RATES as readonly number[]).includes(stored)) rate = stored;
} catch {
  /* storage unavailable: start at normal speed */
}
const listeners = new Set<() => void>();

/** Next speed in the 1x → 1.5x → 2x cycle. */
export const nextRate = (current: number) =>
  PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(current as 1) + 1) % PLAYBACK_RATES.length];

export function setPlaybackRate(next: number) {
  rate = next;
  try {
    localStorage.setItem(KEY, String(next));
  } catch {
    /* not persisted, still applied */
  }
  listeners.forEach((listener) => listener());
}

/**
 * The listener's speed for voice notes and audio. One shared value, so changing it on one
 * message changes it for every message already in the chat.
 */
export function usePlaybackRate() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => rate,
    () => 1
  );
}
