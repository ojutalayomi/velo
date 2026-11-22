"use client";

import { Download, Music, Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

import { PlaybackSpeedButton } from "@/components/chat/PlaybackSpeedButton";
import { usePlaybackRate } from "@/hooks/usePlaybackRate";
import { formatFileSize } from "@/lib/utils";
import { formatClock } from "@/lib/voiceNote";

/** An audio file someone sent (a song, a recording made elsewhere): named, seekable, downloadable. */
export function AudioFileCard({
  url,
  name,
  size,
  onDownload,
}: {
  url: string;
  name: string;
  size?: number;
  onDownload?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const rate = usePlaybackRate();
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  };

  return (
    <div className="flex min-w-[240px] max-w-[320px] flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-300">
          <Music size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Audio{size ? ` · ${formatFileSize(size)}` : ""}
          </p>
        </div>
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            aria-label="Download audio"
            className="shrink-0 rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700"
          >
            <Download size={16} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause audio" : "Play audio"}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white hover:opacity-90"
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={Math.min(time, duration || 1)}
          aria-label="Seek audio"
          onChange={(event) => {
            const audio = audioRef.current;
            if (audio) audio.currentTime = Number(event.target.value);
            setTime(Number(event.target.value));
          }}
          className="h-1 min-w-0 flex-1 cursor-pointer accent-brand"
        />
        <span className="w-[4.5rem] shrink-0 text-right text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
          {formatClock(time)} / {formatClock(duration)}
        </span>
        <PlaybackSpeedButton />
      </div>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={(event) => {
          event.currentTarget.playbackRate = rate;
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        onTimeUpdate={(event) => {
          if (event.currentTarget.playbackRate !== rate) event.currentTarget.playbackRate = rate;
          setTime(event.currentTarget.currentTime);
        }}
        onLoadedMetadata={(event) => {
          event.currentTarget.playbackRate = rate;
          if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration);
        }}
      />
    </div>
  );
}
