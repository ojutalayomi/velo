"use client";

import { Mic, Pause, Send, Trash } from "lucide-react";

import { VoiceNotePlayer } from "@/components/VoiceNotePlayer";
import { Button } from "@/components/ui/button";
import { MAX_VOICE_SECONDS, useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { formatClock } from "@/lib/voiceNote";

type Recorder = ReturnType<typeof useVoiceRecorder>;

/** The composer while a voice note is being made: pause to listen back, resume, send or discard. */
export function VoiceRecorderBar({ voice, onSend }: { voice: Recorder; onSend: () => void }) {
  const busy = voice.processing;

  return (
    <div className="flex flex-col gap-1 px-2 py-1.5">
      {voice.paused && voice.previewUrl && (
        <VoiceNotePlayer url={voice.previewUrl} durationHint={voice.seconds} className="px-1" />
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          aria-label="Discard voice note"
          onClick={voice.cancel}
          disabled={busy}
          className="h-auto rounded-full p-2 text-gray-600 hover:text-red-500 dark:text-gray-300"
        >
          <Trash size={20} />
        </Button>
        <span className="flex flex-1 items-center gap-2 text-sm dark:text-white">
          <span
            className={`size-2.5 rounded-full bg-red-500 ${voice.paused || busy ? "opacity-40" : "animate-pulse"}`}
          />
          {busy ? (
            <span className="text-sm text-gray-500">Preparing voice note…</span>
          ) : (
            <>
              {formatClock(voice.seconds)}
              <span className="text-xs text-gray-500">
                {voice.paused ? "paused" : `/ ${formatClock(MAX_VOICE_SECONDS)}`}
              </span>
            </>
          )}
        </span>
        <Button
          variant="ghost"
          aria-label={voice.paused ? "Resume recording" : "Pause recording"}
          onClick={voice.paused ? voice.resume : voice.pause}
          disabled={busy}
          className="h-auto rounded-full p-2 text-red-500 hover:bg-red-500/10"
        >
          {voice.paused ? <Mic size={20} /> : <Pause size={20} />}
        </Button>
        <Button
          aria-label="Send voice note"
          onClick={onSend}
          disabled={busy}
          className="h-auto rounded-full bg-brand p-2.5 text-white hover:bg-brand/90"
        >
          <Send size={20} />
        </Button>
      </div>
    </div>
  );
}
