/* eslint-disable @next/next/no-img-element */
"use client";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Mic,
  Send,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import moment from "moment";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { VoiceRecorderBar } from "@/components/chat/VoiceRecorderBar";
import { MAX_VOICE_SECONDS, useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  FullscreenSheet,
  FullscreenSheetContent,
  FullscreenSheetDescription,
  FullscreenSheetTitle,
  SheetIconButton,
} from "@/components/ui/fullscreen-sheet";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Statuser } from "@/components/VerificationComponent";
import {
  deleteStatus,
  fetchStatusViewers,
  markStatusViewed,
  replyToStatus,
  replyToStatusWithVoice,
  setStatusLiked,
} from "@/lib/statusApi";
import { statusBackground } from "@/lib/statusBackgrounds";
import type { StatusClient, StatusGroup, StatusViewerDetail } from "@/lib/types/status";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/voiceNote";
import { useAppDispatch } from "@/redux/hooks";
import { markViewedLocal, removeStatus, setStatusLikes } from "@/redux/statusSlice";

/** One tap on these sends the emoji as a reply. */
const QUICK_REPLIES = ["❤️", "😂", "😮", "😢", "👏", "🔥"];

/** How long a photo or text status stays up (video and voice run for their own length). */
export const STATUS_DURATION_MS = 6000;

/** Text statuses stay a little longer the more there is to read. */
export function statusDurationMs(status: Pick<StatusClient, "mediaType" | "text">) {
  if (status.mediaType !== "text") return STATUS_DURATION_MS;
  return Math.min(12000, STATUS_DURATION_MS + (status.text?.length ?? 0) * 25);
}

/** Photos and text are timed; video and voice play for as long as they last. */
const isTimed = (status: Pick<StatusClient, "mediaType">) =>
  status.mediaType === "image" || status.mediaType === "text";

/** Renders @mentions that resolved to real accounts as profile links. */
export function renderCaption(caption: string, mentions: StatusClient["mentions"] = []) {
  if (!mentions.length) return caption;
  const known = new Set(mentions.map((m) => m.username.toLowerCase()));
  return caption.split(/(\B@[a-zA-Z0-9_]{1,30}\b)/g).map((part, index) => {
    const username = part.startsWith("@") ? part.slice(1) : "";
    if (username && known.has(username.toLowerCase())) {
      return (
        <Link
          key={index}
          href={`/${username}`}
          className="font-semibold text-brand hover:underline"
        >
          {part}
        </Link>
      );
    }
    return part;
  });
}

export const StatusViewer = ({
  groups,
  initialGroupIndex,
  initialStatusIndex,
  onClose,
  onViewed,
}: {
  groups: StatusGroup[];
  initialGroupIndex: number;
  initialStatusIndex: number;
  onClose: () => void;
  /** Called once a status has been recorded as viewed (for callers that keep their own list). */
  onViewed?: (statusId: string) => void;
}) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { userdata } = useUser();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [statusIndex, setStatusIndex] = useState(Math.max(0, initialStatusIndex));
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [reply, setReply] = useState("");
  const [replyFocused, setReplyFocused] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const voice = useVoiceRecorder();
  const socket = useSocket();
  // Likes tapped here show at once, even for callers (Explore) that keep their own copy of the list.
  const [likes, setLikes] = useState<Record<string, { liked: boolean; likeCount: number }>>({});
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const holdStartedAt = useRef(0);
  const elapsedMs = useRef(0);

  const group = groups[groupIndex];
  const rawStatus = group?.statuses[statusIndex];
  const status =
    rawStatus && likes[rawStatus._id] ? { ...rawStatus, ...likes[rawStatus._id] } : rawStatus;
  const isOwner = status?.userId === userdata._id;
  // Typing a reply holds the status still, too.
  const paused = holding || viewersOpen || replyFocused || voice.recording || voice.processing;

  const goNext = useCallback(() => {
    if (!group) return;
    if (statusIndex < group.statuses.length - 1) {
      setStatusIndex((value) => value + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((value) => value + 1);
      setStatusIndex(0);
    } else {
      onClose();
    }
  }, [group, groupIndex, groups.length, onClose, statusIndex]);

  const goPrevious = useCallback(() => {
    if (statusIndex > 0) {
      setStatusIndex((value) => value - 1);
    } else if (groupIndex > 0) {
      const previousGroup = groups[groupIndex - 1];
      setGroupIndex((value) => value - 1);
      setStatusIndex(Math.max(0, previousGroup.statuses.length - 1));
    }
  }, [groupIndex, groups, statusIndex]);

  // The timers and media events below outlive a render, so they call the latest of these.
  const goNextRef = useRef(goNext);
  const pausedRef = useRef(paused);
  useEffect(() => {
    goNextRef.current = goNext;
    pausedRef.current = paused;
  }, [goNext, paused]);

  const statusId = status?._id;

  // Each status starts from the beginning.
  const [shownId, setShownId] = useState(statusId);
  if (shownId !== statusId) {
    setShownId(statusId);
    setProgress(0);
    setNeedsTap(false);
  }

  // Recording the view, once per status.
  useEffect(() => {
    elapsedMs.current = 0;
    if (!status || isOwner || status.viewed) return;
    markStatusViewed(status._id)
      .then(() => {
        dispatch(
          markViewedLocal({
            statusId: status._id,
            viewer: { userId: userdata._id, viewedAt: new Date().toISOString() },
          })
        );
        onViewed?.(status._id);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusId]);

  // Photos and text run on a timer that stands still while paused.
  useEffect(() => {
    if (!status || !isTimed(status)) return;
    const total = statusDurationMs(status);
    const interval = window.setInterval(() => {
      if (pausedRef.current) return;
      elapsedMs.current += 100;
      const next = Math.min(100, (elapsedMs.current / total) * 100);
      setProgress(next);
      if (next >= 100) {
        window.clearInterval(interval);
        goNextRef.current();
      }
    }, 100);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusId]);

  // Video and voice follow the pause, and fall back to a tap (or muted) if autoplay is refused.
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.muted = muted;
    if (paused) {
      el.pause();
      return;
    }
    // `play()` can be refused (autoplay rules) and, in very old browsers, returns nothing.
    Promise.resolve(el.play()).catch(() => {
      if (el instanceof HTMLVideoElement && !el.muted) {
        setMuted(true);
        el.muted = true;
        Promise.resolve(el.play()).catch(() => setNeedsTap(true));
      } else {
        setNeedsTap(true);
      }
    });
  }, [paused, muted, statusId]);

  // Keyboard: arrows move between statuses (Escape closes through the sheet itself).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (viewersOpen) return;
      // Arrow keys belong to the reply box while you type in it.
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "ArrowRight") goNext();
      else if (event.key === "ArrowLeft") goPrevious();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrevious, viewersOpen]);

  const sendVoiceReply = async () => {
    const file = await voice.stop();
    if (!file || !status || sendingReply) return;
    setSendingReply(true);
    try {
      const { chatId } = await replyToStatusWithVoice({
        socket,
        statusId: status._id,
        file,
        sender: {
          id: userdata._id,
          name: userdata.name ?? "",
          username: userdata.username ?? "",
          displayPicture: userdata.displayPicture ?? "",
          verified: Boolean(userdata.verified),
        },
      });
      toast.success("Voice reply sent", {
        action: { label: "View", onClick: () => router.push(`/chats/${chatId}`) },
      });
    } catch (error) {
      toast.error((error as Error).message || "Could not send your reply");
    } finally {
      setSendingReply(false);
    }
  };
  // A recording is capped; reaching the cap sends what was recorded.
  useEffect(() => {
    if (voice.recording && voice.seconds >= MAX_VOICE_SECONDS)
      void Promise.resolve().then(sendVoiceReply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.recording, voice.seconds]);
  const startVoiceReply = async () => {
    const error = await voice.start();
    if (error) toast.error(error);
  };

  if (!group || !status) return null;

  const handleDelete = async () => {
    try {
      await deleteStatus(status._id);
      dispatch(removeStatus({ statusId: status._id, ownerId: status.userId }));
      toast.success("Status deleted");
      goNext();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const toggleLike = async () => {
    const liked = !status.liked;
    const likeCount = Math.max(0, status.likeCount + (liked ? 1 : -1));
    const previous = { liked: status.liked, likeCount: status.likeCount };
    const apply = (value: { liked: boolean; likeCount: number }) => {
      setLikes((current) => ({ ...current, [status._id]: value }));
      dispatch(setStatusLikes({ statusId: status._id, ...value }));
    };
    apply({ liked, likeCount });
    try {
      apply(await setStatusLiked(status._id, liked));
    } catch (error) {
      apply(previous);
      toast.error((error as Error).message || "Could not update your like");
    }
  };

  const sendReply = async (content: string) => {
    const text = content.trim();
    if (!text || sendingReply) return;
    setSendingReply(true);
    try {
      const { chatId } = await replyToStatus(status._id, text);
      setReply("");
      setReplyFocused(false);
      (document.activeElement as HTMLElement | null)?.blur();
      toast.success("Reply sent", {
        action: { label: "View", onClick: () => router.push(`/chats/${chatId}`) },
      });
    } catch (error) {
      toast.error((error as Error).message || "Could not send your reply");
    } finally {
      setSendingReply(false);
    }
  };


  const startHold = (event: React.PointerEvent) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("[data-no-hold]")) return;
    holdStartedAt.current = Date.now();
    setHolding(true);
  };
  const endHold = () => setHolding(false);
  // A press that was a hold, not a tap, must not also move to the next status.
  const tapped = () => Date.now() - holdStartedAt.current < 250;

  return (
    <FullscreenSheet open onOpenChange={(open) => !open && onClose()}>
      <FullscreenSheetContent
        className="z-80 items-center justify-center bg-black"
        aria-describedby={undefined}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerCancel={endHold}
        onPointerLeave={endHold}
        initialFocus={false}
      >
        <FullscreenSheetTitle className="sr-only">
          {isOwner ? "Your status" : `Status from ${group.user.name}`}
        </FullscreenSheetTitle>
        <FullscreenSheetDescription className="sr-only">
          Tap the sides to move between statuses. Press and hold to pause.
        </FullscreenSheetDescription>

        <div
          data-no-hold
          className="absolute inset-x-0 top-0 z-20 bg-linear-to-b from-black/60 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]"
        >
          <div className="mb-3 flex gap-1">
            {group.statuses.map((item, index) => (
              <div key={item._id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full bg-white"
                  style={{
                    width:
                      index < statusIndex ? "100%" : index === statusIndex ? `${progress}%` : "0%",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar>
                <AvatarImage src={group.user.displayPicture} />
                <AvatarFallback>{group.user.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1 font-semibold">
                  <span className="truncate">{isOwner ? "My status" : group.user.name}</span>
                  {!isOwner && group.user.verified && <Statuser className="size-4 shrink-0" />}
                </div>
                <div className="text-xs text-white/70">{moment(status.createdAt).fromNow()}</div>
              </div>
            </div>
            <div className="flex items-center">
              {status.mediaType === "video" && (
                <SheetIconButton
                  onClick={() => setMuted((value) => !value)}
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </SheetIconButton>
              )}
              {isOwner && (
                <SheetIconButton onClick={handleDelete} aria-label="Delete status">
                  <Trash2 className="size-5" />
                </SheetIconButton>
              )}
              <SheetIconButton onClick={onClose} aria-label="Close status">
                <X className="size-6" />
              </SheetIconButton>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="absolute bottom-28 left-0 top-28 z-10 flex w-1/4 items-center justify-start px-4"
          onClick={() => tapped() && goPrevious()}
          aria-label="Previous status"
        >
          <ChevronLeft className="size-8 opacity-70" />
        </button>

        <StatusMedia
          key={status._id}
          status={status}
          user={group.user}
          mediaRef={mediaRef}
          muted={muted}
          needsTap={needsTap}
          onPlayTap={() => {
            setNeedsTap(false);
            void Promise.resolve(mediaRef.current?.play()).catch(() => setNeedsTap(true));
          }}
          onProgress={setProgress}
          onEnded={() => goNextRef.current()}
        />

        <button
          type="button"
          className="absolute bottom-28 right-0 top-28 z-10 flex w-1/4 items-center justify-end px-4"
          onClick={() => tapped() && goNext()}
          aria-label="Next status"
        >
          <ChevronRight className="size-8 opacity-70" />
        </button>

        <div
          data-no-hold
          className="absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-black/80 via-black/40 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10"
        >
          {status.caption && (
            <p className="mx-auto mb-3 max-h-40 max-w-xl overflow-y-auto whitespace-pre-wrap text-center text-sm">
              {renderCaption(status.caption, status.mentions)}
            </p>
          )}
          <div className="mx-auto flex max-w-xl items-center justify-between">
            {isOwner ? (
              <>
                <button
                  type="button"
                  onClick={() => setViewersOpen(true)}
                  className="flex h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-medium backdrop-blur-sm hover:bg-white/20"
                  aria-label={`${status.viewCount} ${status.viewCount === 1 ? "view" : "views"}. See who viewed`}
                >
                  <Eye className="size-5" />
                  {status.viewCount}
                </button>
                <span
                  className="flex h-11 items-center gap-2 px-2 text-sm font-medium text-white/90"
                  aria-label={`${status.likeCount} ${status.likeCount === 1 ? "like" : "likes"}`}
                >
                  <Heart
                    className={cn("size-5", status.likeCount > 0 && "fill-red-500 text-red-500")}
                  />
                  {status.likeCount}
                </span>
              </>
            ) : voice.recording || voice.processing ? (
              <div data-no-hold className="w-full rounded-2xl bg-background text-foreground shadow-lg">
                <VoiceRecorderBar voice={voice} onSend={() => void sendVoiceReply()} />
              </div>
            ) : (
              <form
                className="flex w-full flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendReply(reply);
                }}
              >
                {replyFocused && (
                  <div
                    className="flex justify-between gap-1"
                    role="group"
                    aria-label="Quick reactions"
                  >
                    {QUICK_REPLIES.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        // Pressing one must not blur the box first, or the row would vanish before the tap.
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => void sendReply(emoji)}
                        disabled={sendingReply}
                        className="flex size-11 items-center justify-center rounded-full bg-white/10 text-2xl backdrop-blur-sm transition-transform hover:bg-white/20 active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    onFocus={() => setReplyFocused(true)}
                    onBlur={() => setReplyFocused(false)}
                    maxLength={1000}
                    enterKeyHint="send"
                    aria-label={`Reply to ${group.user.name}`}
                    placeholder={`Reply to ${group.user.name.split(" ")[0]}…`}
                    className="h-11 min-w-0 flex-1 rounded-full border border-white/30 bg-black/30 px-4 text-sm text-white outline-hidden backdrop-blur-sm placeholder:text-white/60 focus:border-white/70"
                  />
                  {!reply.trim() && (
                    <button
                      type="button"
                      onClick={() => void startVoiceReply()}
                      disabled={sendingReply}
                      aria-label="Record a voice reply"
                      onMouseDown={(event) => event.preventDefault()}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-transform hover:bg-white/20 active:scale-90 disabled:opacity-60"
                    >
                      <Mic className="size-5" />
                    </button>
                  )}
                  {reply.trim() && (
                    <button
                      type="submit"
                      disabled={sendingReply}
                      aria-label="Send reply"
                      onMouseDown={(event) => event.preventDefault()}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-transform active:scale-90 disabled:opacity-60"
                    >
                      <Send className="size-5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleLike}
                    aria-pressed={status.liked}
                    aria-label={status.liked ? "Unlike status" : "Like status"}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-transform hover:bg-white/20 active:scale-90"
                  >
                    <Heart
                      className={cn(
                        "size-6 transition-colors",
                        status.liked && "fill-red-500 text-red-500"
                      )}
                    />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {isOwner && (
          <StatusViewersSheet
            statusId={status._id}
            open={viewersOpen}
            onOpenChange={setViewersOpen}
          />
        )}
      </FullscreenSheetContent>
    </FullscreenSheet>
  );
};

const StatusMedia = ({
  status,
  user,
  mediaRef,
  muted,
  needsTap,
  onPlayTap,
  onProgress,
  onEnded,
}: {
  status: StatusClient;
  user: StatusGroup["user"];
  mediaRef: React.MutableRefObject<HTMLMediaElement | null>;
  muted: boolean;
  needsTap: boolean;
  onPlayTap: () => void;
  onProgress: (percent: number) => void;
  onEnded: () => void;
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [length, setLength] = useState(status.durationSec ?? 0);
  const onTime = (event: React.SyntheticEvent<HTMLMediaElement>) => {
    const el = event.currentTarget;
    setElapsed(el.currentTime);
    if (Number.isFinite(el.duration) && el.duration > 0) {
      onProgress(Math.min(100, (el.currentTime / el.duration) * 100));
    }
  };
  const onMeta = (event: React.SyntheticEvent<HTMLMediaElement>) => {
    if (Number.isFinite(event.currentTarget.duration)) setLength(event.currentTarget.duration);
  };

  if (status.mediaType === "text") {
    const bg = statusBackground(status.background);
    const text = status.text ?? "";
    return (
      <div
        className="flex size-full items-center justify-center px-8 py-28"
        style={{ background: bg.css }}
      >
        <p
          className={cn(
            "max-h-full w-full max-w-xl overflow-y-auto wrap-break-word text-center font-bold",
            "dark" in bg && bg.dark ? "text-zinc-900" : "text-white",
            text.length > 220 ? "text-xl" : text.length > 90 ? "text-3xl" : "text-4xl"
          )}
          style={{ whiteSpace: "pre-wrap" }}
        >
          {text}
        </p>
      </div>
    );
  }

  if (status.mediaType === "audio") {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-6 bg-linear-to-b from-zinc-900 to-zinc-950 px-8">
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand/30 [animation-duration:2.4s]" />
          <Avatar className="size-32 border-4 border-brand/60">
            <AvatarImage src={user.displayPicture} />
            <AvatarFallback className="text-3xl">{user.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-1 -right-1 flex size-10 items-center justify-center rounded-full bg-brand text-white shadow-lg">
            <Mic className="size-5" />
          </span>
        </div>
        <p className="text-lg font-medium tabular-nums">
          {formatClock(Math.floor(elapsed))}
          <span className="text-white/60"> / {formatClock(Math.round(length))}</span>
        </p>
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={status.mediaUrl}
          preload="auto"
          onTimeUpdate={onTime}
          onLoadedMetadata={onMeta}
          onEnded={onEnded}
        />
        {needsTap && <PlayTap onClick={onPlayTap} />}
      </div>
    );
  }

  if (status.mediaType === "video") {
    return (
      <>
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={status.mediaUrl}
          className="max-h-full max-w-full object-contain"
          playsInline
          muted={muted}
          onTimeUpdate={onTime}
          onLoadedMetadata={onMeta}
          onEnded={onEnded}
        />
        {needsTap && <PlayTap onClick={onPlayTap} />}
      </>
    );
  }

  return <img src={status.mediaUrl} alt="" className="max-h-full max-w-full object-contain" />;
};

const PlayTap = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    data-no-hold
    onClick={onClick}
    className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 px-6 py-3 text-base font-semibold backdrop-blur-sm"
  >
    Tap to play
  </button>
);

/** The owner's "viewed by" list: a dialog on large screens, a bottom sheet on phones. */
export const StatusViewersSheet = ({
  statusId,
  open,
  onOpenChange,
}: {
  statusId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [loaded, setLoaded] = useState<{
    id: string;
    rows: StatusViewerDetail[] | null;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchStatusViewers(statusId)
      .then((rows) => !cancelled && setLoaded({ id: statusId, rows }))
      .catch(() => !cancelled && setLoaded({ id: statusId, rows: null }));
    return () => {
      cancelled = true;
    };
  }, [open, statusId]);

  // Not loaded yet, or the answer is for another status: show the loading state.
  const answered = loaded?.id === statusId;
  const viewers = answered ? loaded.rows : null;
  const failed = answered && loaded.rows === null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} elevated>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {viewers ? `Viewed by ${viewers.length}` : "Viewed by"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>People who opened this status.</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="max-h-[50dvh] min-h-24 overflow-y-auto">
          {failed ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Could not load the list.{" "}
              <Button variant="link" className="h-auto p-0" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </p>
          ) : viewers === null ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <Skeleton className="h-4 w-40 rounded" />
                </div>
              ))}
            </div>
          ) : viewers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No views yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {viewers.map((viewer) => (
                <li key={viewer.userId} className="flex items-center gap-3 py-2.5">
                  <Avatar className="size-10">
                    <AvatarImage src={viewer.displayPicture} />
                    <AvatarFallback>{viewer.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 font-medium">
                      <span className="truncate">{viewer.name}</span>
                      {viewer.verified && <Statuser className="size-4 shrink-0" />}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {viewer.username ? `@${viewer.username} · ` : ""}
                      {moment(viewer.viewedAt).fromNow()}
                    </p>
                  </div>
                  {viewer.liked && (
                    <Heart
                      className="size-5 shrink-0 fill-red-500 text-red-500"
                      aria-label="Liked"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
