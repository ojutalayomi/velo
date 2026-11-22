"use client";

import { nextRate, setPlaybackRate, usePlaybackRate } from "@/hooks/usePlaybackRate";

/** Cycles playback speed 1x → 1.5x → 2x; the choice applies to every voice note and audio message. */
export function PlaybackSpeedButton({ className }: { className?: string }) {
  const rate = usePlaybackRate();
  return (
    <button
      type="button"
      onClick={() => setPlaybackRate(nextRate(rate))}
      aria-label={`Playback speed ${rate}x. Change speed`}
      className={
        className ??
        "w-9 shrink-0 rounded-full bg-black/10 py-0.5 text-center text-[11px] font-semibold tabular-nums text-gray-700 transition-colors hover:bg-black/20 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20"
      }
    >
      {rate}x
    </button>
  );
}
