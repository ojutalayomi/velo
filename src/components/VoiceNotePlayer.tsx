"use client";

import { Mic, Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

import { formatClock, voiceNoteSeconds } from "@/lib/voiceNote";
import { cn } from "@/lib/utils";

/** Compact play/pause + progress player for a voice note. */
export function VoiceNotePlayer({
  url,
  name,
  className,
}: {
  url: string;
  name?: string;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState(0);
  // Freshly recorded files often report an infinite length, so the name's copy is the fallback.
  const duration = loadedDuration || voiceNoteSeconds(name) || 0;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  };

  return (
    <div className={cn("flex min-w-[220px] items-center gap-2.5 py-1", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-opacity hover:opacity-90"
      >
        {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={Math.min(time, duration || 1)}
          aria-label="Seek voice note"
          onChange={(event) => {
            const audio = audioRef.current;
            if (audio) audio.currentTime = Number(event.target.value);
            setTime(Number(event.target.value));
          }}
          className="h-1 w-full cursor-pointer accent-brand"
        />
        <div className="mt-0.5 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
          <span>{formatClock(playing || time > 0 ? time : duration)}</span>
          <Mic size={12} />
        </div>
      </div>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const d = event.currentTarget.duration;
          if (Number.isFinite(d)) setLoadedDuration(d);
        }}
      />
    </div>
  );
}
