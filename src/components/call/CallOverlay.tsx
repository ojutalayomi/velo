"use client";

import {
  ChevronDown,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  endReasonLabel,
  formatDuration,
  type CallParticipant,
  type CallState,
} from "@/lib/call/callState";
import { cn } from "@/lib/utils";

import { useCall } from "./callContext";

function StreamElement({
  stream,
  kind,
  muted = false,
  className,
}: {
  stream: MediaStream | null;
  kind: "audio" | "video";
  muted?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLMediaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) el.play().catch(() => undefined); // autoplay can be blocked until interaction
  }, [stream]);

  return kind === "video" ? (
    <video
      ref={ref as React.RefObject<HTMLVideoElement>}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  ) : (
    <audio ref={ref as React.RefObject<HTMLAudioElement>} autoPlay muted={muted} />
  );
}

function PeerAvatar({
  name,
  src,
  className,
  ring = false,
}: {
  name: string;
  src?: string;
  className?: string;
  ring?: boolean;
}) {
  return (
    <div className="relative">
      {ring && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
          <span
            className="absolute -inset-3 animate-ping rounded-full bg-brand/15"
            style={{ animationDelay: "400ms" }}
          />
        </>
      )}
      <Avatar className={cn("relative size-28 border-4 border-white/10", className)}>
        <AvatarImage src={src} alt={name} className="object-cover" />
        <AvatarFallback className="bg-zinc-700 text-3xl font-semibold text-white">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

function RoundButton({
  label,
  onClick,
  active = false,
  danger = false,
  accept = false,
  large = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  accept?: boolean;
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active || undefined}
        className={cn(
          "flex items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95",
          large ? "size-16" : "size-14",
          danger && "bg-red-600 hover:bg-red-500",
          accept && "bg-green-600 hover:bg-green-500",
          !danger && !accept && (active ? "bg-white text-zinc-900" : "bg-white/15 hover:bg-white/25")
        )}
      >
        {children}
      </button>
      <span className="text-xs text-white/80">{label}</span>
    </div>
  );
}

function statusText(state: CallState, seconds: number) {
  const others = Object.keys(state.participants).length;
  switch (state.status) {
    case "outgoing":
      return state.call?.callId ? "Ringing…" : "Calling…";
    case "connecting":
      return "Connecting…";
    case "connected":
      return state.call?.chatType === "Group" && others > 0
        ? `${formatDuration(seconds)} · ${others + 1} in call`
        : formatDuration(seconds);
    default:
      return "";
  }
}

/** One participant in a group call: their video (or avatar) and name. */
function ParticipantTile({
  participant,
  stream,
  isVideo,
}: {
  participant: CallParticipant;
  stream: MediaStream | null;
  isVideo: boolean;
}) {
  const hasVideo = isVideo && !!stream && stream.getVideoTracks().length > 0;
  return (
    <div className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-800/90">
      {hasVideo ? (
        <StreamElement
          stream={stream}
          kind="video"
          muted
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <Avatar className="size-20 border-2 border-white/10 sm:size-24">
          <AvatarImage src={participant.avatar} alt="" className="object-cover" />
          <AvatarFallback className="bg-zinc-700 text-xl font-semibold text-white">
            {participant.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <span className="absolute bottom-2 left-2 max-w-[80%] truncate rounded-full bg-black/55 px-2.5 py-1 text-xs">
        {participant.name}
      </span>
      {!participant.connected && (
        <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white/80">
          Connecting…
        </span>
      )}
    </div>
  );
}

function useElapsedSeconds(connectedAt: number | null) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!connectedAt) return;
    const tick = () => setSeconds((Date.now() - connectedAt) / 1000);
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [connectedAt]);
  return connectedAt ? seconds : 0;
}

export default function CallOverlay() {
  const {
    state,
    localStream,
    remoteStreams,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
    setMinimized,
  } = useCall();
  const seconds = useElapsedSeconds(state.connectedAt);
  const { status, call } = state;

  if (status === "idle" || !call) return null;

  const isVideo = call.callType === "video";
  const kindLabel = isVideo ? "video call" : "voice call";
  const where = call.chatType === "Group" ? " · Group" : "";

  const participantIds = Object.keys(state.participants);
  const isGroup = call.chatType === "Group";
  const firstRemote = participantIds.length ? (remoteStreams[participantIds[0]] ?? null) : null;

  // Remote audio keeps playing whatever the UI is showing (full screen, minimized, or ended).
  const remoteAudio = (
    <>
      {Object.entries(remoteStreams).map(([id, stream]) => (
        <StreamElement key={id} stream={stream} kind="audio" />
      ))}
    </>
  );

  if (status === "incoming") {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={`Incoming ${kindLabel} from ${call.peer.name}`}
        className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      >
        <div className="flex w-full max-w-sm flex-col items-center gap-8 rounded-3xl bg-zinc-900 px-6 py-10 text-white shadow-2xl ring-1 ring-white/10">
          <PeerAvatar name={call.peer.name} src={call.peer.avatar} ring />
          <div className="text-center">
            <h2 className="text-2xl font-semibold">{call.peer.name}</h2>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-white/70">
              {isVideo ? <Video size={14} /> : <Phone size={14} />}
              Incoming {kindLabel}
              {where}
            </p>
          </div>
          <div className="flex items-center gap-12">
            <RoundButton label="Decline" danger large onClick={declineCall}>
              <PhoneOff size={26} />
            </RoundButton>
            <RoundButton label="Accept" accept large onClick={() => void acceptCall()}>
              {isVideo ? <Video size={26} /> : <Phone size={26} />}
            </RoundButton>
          </div>
        </div>
      </div>
    );
  }

  if (status === "ended") {
    return (
      <>
        {remoteAudio}
        <div
          role="status"
          className="fixed inset-x-0 bottom-24 z-100 mx-auto flex w-fit items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm text-white shadow-xl ring-1 ring-white/10"
        >
          <PhoneOff size={16} className="text-red-400" />
          {endReasonLabel(state.endReason, call.direction)}
        </div>
      </>
    );
  }

  if (state.minimized) {
    return (
      <>
        {remoteAudio}
        <div className="fixed bottom-20 right-3 z-100 flex items-center gap-3 rounded-full bg-zinc-900 py-2 pl-2 pr-3 text-white shadow-xl ring-1 ring-white/10">
          <button
            type="button"
            onClick={() => setMinimized(false)}
            aria-label="Return to call"
            className="flex items-center gap-3 text-left"
          >
            <Avatar className="size-10">
              <AvatarImage src={call.peer.avatar} alt="" className="object-cover" />
              <AvatarFallback className="bg-zinc-700 text-xs">
                {call.peer.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="leading-tight">
              <span className="block max-w-[120px] truncate text-sm font-medium">
                {call.peer.name}
              </span>
              <span className="block text-xs text-green-400">{statusText(state, seconds)}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={endCall}
            aria-label="End call"
            className="flex size-9 items-center justify-center rounded-full bg-red-600"
          >
            <PhoneOff size={16} />
          </button>
        </div>
      </>
    );
  }

  const showGrid = isGroup && participantIds.length > 0;
  const showRemoteVideo = !showGrid && isVideo && !!firstRemote;
  const gridCols =
    participantIds.length <= 1
      ? "grid-cols-1"
      : participantIds.length <= 3
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-2 sm:grid-cols-3";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${call.peer.name} ${kindLabel}`}
      className="fixed inset-0 z-100 flex flex-col bg-zinc-950 text-white"
    >
      {remoteAudio}
      {showRemoteVideo && (
        <StreamElement
          stream={firstRemote}
          kind="video"
          muted
          className="absolute inset-0 size-full object-cover"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/70" />

      {/* Header */}
      <div className="relative flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setMinimized(true)}
          aria-label="Minimize call"
          className="rounded-full bg-white/10 p-2 hover:bg-white/20"
        >
          <ChevronDown size={22} />
        </button>
        <div className="text-center">
          <p className="max-w-[60vw] truncate text-base font-semibold">{call.peer.name}</p>
          <p className="text-sm text-white/70" aria-live="polite">
            {statusText(state, seconds)}
          </p>
        </div>
        <span className="size-10" aria-hidden />
      </div>

      {/* Body */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {showGrid ? (
          <div className={cn("grid size-full auto-rows-fr gap-2 p-3", gridCols)}>
            {participantIds.map((id) => (
              <ParticipantTile
                key={id}
                participant={state.participants[id]}
                stream={remoteStreams[id] ?? null}
                isVideo={isVideo}
              />
            ))}
          </div>
        ) : (
          !showRemoteVideo && (
            <PeerAvatar
              name={call.peer.name}
              src={call.peer.avatar}
              className="size-36"
              ring={status === "outgoing"}
            />
          )
        )}
        {isVideo && localStream && (
          <div className="absolute right-4 top-4 h-40 w-28 overflow-hidden rounded-2xl border border-white/20 bg-zinc-800 shadow-lg sm:h-48 sm:w-36">
            {state.cameraOff ? (
              <div className="flex size-full items-center justify-center text-white/60">
                <VideoOff size={24} />
              </div>
            ) : (
              <StreamElement
                stream={localStream}
                kind="video"
                muted
                className="size-full -scale-x-100 object-cover"
              />
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="relative flex items-start justify-center gap-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
        <RoundButton
          label={state.muted ? "Unmute" : "Mute"}
          active={state.muted}
          onClick={toggleMute}
        >
          {state.muted ? <MicOff size={22} /> : <Mic size={22} />}
        </RoundButton>
        {isVideo && (
          <RoundButton
            label={state.cameraOff ? "Camera on" : "Camera off"}
            active={state.cameraOff}
            onClick={toggleCamera}
          >
            {state.cameraOff ? <VideoOff size={22} /> : <Video size={22} />}
          </RoundButton>
        )}
        <RoundButton label="End" danger onClick={endCall}>
          <PhoneOff size={22} />
        </RoundButton>
      </div>
    </div>
  );
}
