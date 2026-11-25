"use client";

import { Loader, Mic, Play } from "lucide-react";
import { useState } from "react";

import { useSocket } from "@/app/providers/SocketProvider";
import {
  FullscreenSheet,
  FullscreenSheetContent,
  FullscreenSheetDescription,
  FullscreenSheetTitle,
  FullscreenSheetClose,
  SheetIconButton,
} from "@/components/ui/fullscreen-sheet";
import { requestViewOnce, viewOnceKind, viewOnceState } from "@/lib/viewOnce";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Cross2Icon } from "@radix-ui/react-icons";

interface Props {
  message: {
    _id?: string;
    messageType?: string;
    viewOnceOpenedBy?: string[];
    viewOnceGone?: boolean;
    viewOnce?: boolean;
    chatType?: string;
    timestamp?: string;
  };
  userId: string;
  senderId: string;
  time: string;
  /** The sent / read ticks, shown to the sender only. */
  statusIcon?: React.ReactNode;
}

/** The dashed "1" mark used for view once everywhere. */
function OneMark({ muted }: { muted?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
        muted ? "border-gray-400 text-gray-400" : "border-dashed border-brand text-brand"
      )}
    >
      1
    </span>
  );
}

function bubbleText(state: ReturnType<typeof viewOnceState>, kind: string, openedCount: number, group: boolean) {
  switch (state) {
    case "ready":
      return { title: `View ${kind}`, hint: "Tap to open. It can be opened once." };
    case "opened":
      return { title: "Opened", hint: `You've seen this ${kind}` };
    case "expired":
      return { title: "No longer available", hint: `This ${kind} has expired` };
    case "seen":
      return {
        title: "Opened",
        hint: group ? `Opened by ${openedCount}` : `Your ${kind} was opened`,
      };
    default:
      return { title: `View once ${kind}`, hint: "Not opened yet" };
  }
}

/**
 * A view once photo, video or voice note. The message never holds the file: tapping asks the
 * server for a short-lived link, once, and the file is shown only inside the viewer.
 */
export function ViewOnceBubble({ message, userId, senderId, time, statusIcon }: Props) {
  const socket = useSocket();
  const [opening, setOpening] = useState(false);
  const [open, setOpen] = useState<{ url: string } | null>(null);

  const state = viewOnceState(message, userId, senderId);
  const kind = viewOnceKind(message.messageType);
  const mine = senderId === userId;
  const text = bubbleText(state, kind, message.viewOnceOpenedBy?.length ?? 0, message.chatType === "Group");
  const canOpen = state === "ready" && Boolean(message._id) && !opening;

  const openIt = async () => {
    if (!canOpen || !message._id) return;
    setOpening(true);
    const result = await requestViewOnce(socket, String(message._id));
    setOpening(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setOpen({ url: result.url });
  };

  const Icon = message.messageType === "VoiceNote" ? Mic : Play;

  return (
    <div className={cn("flex flex-col gap-0.5", mine ? "items-end" : "items-start")}>
      <button
        type="button"
        disabled={!canOpen}
        onClick={() => void openIt()}
        aria-label={state === "ready" ? `View once ${kind}. Tap to open` : text.title}
        className={cn(
          "flex min-w-[11rem] items-center gap-3 rounded-lg px-3 py-2.5 text-left shadow",
          mine ? "bg-brand/15 dark:bg-brand/25" : "bg-white dark:bg-zinc-800",
          canOpen ? "cursor-pointer hover:brightness-95" : "cursor-default opacity-80"
        )}
      >
        {opening ? <Loader className="size-7 animate-spin text-brand" /> : <OneMark muted={state !== "ready" && state !== "sent"} />}
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1 text-sm font-medium">
            {state === "ready" && <Icon className="size-3.5" />}
            {text.title}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{text.hint}</span>
        </span>
      </button>
      <div className="flex items-center gap-1 px-1 text-[11px] leading-none text-gray-500 dark:text-gray-400">
        <span>{time}</span>
        {statusIcon}
      </div>

      {open && <ViewOnceViewer url={open.url} messageType={message.messageType} onClose={() => setOpen(null)} />}
    </div>
  );
}
ViewOnceBubble.displayName = "ViewOnceBubble";

/**
 * Shows the file with no way to save it: no download control, no context menu, no picture in
 * picture. The link behind it works for a few minutes and the file is deleted soon after.
 */
export function ViewOnceViewer({
  url,
  messageType,
  onClose,
}: {
  url: string;
  messageType?: string;
  onClose: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const block = (e: React.SyntheticEvent) => e.preventDefault();

  return (
    <FullscreenSheet open onOpenChange={(o) => !o && onClose()}>
      <FullscreenSheetContent
        className="z-[80] items-center justify-center bg-black"
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <FullscreenSheetTitle className="sr-only">View once {viewOnceKind(messageType)}</FullscreenSheetTitle>
        <FullscreenSheetDescription className="sr-only">
          This can only be opened once. It disappears when you close it.
        </FullscreenSheetDescription>

        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent px-2 pb-6 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <FullscreenSheetClose asChild>
            <SheetIconButton aria-label="Close">
              <Cross2Icon className="size-5" />
            </SheetIconButton>
          </FullscreenSheetClose>
          <span className="text-xs text-white/70">Viewable once. It&apos;s gone when you close this.</span>
        </div>

        {failed ? (
          <p className="px-6 text-center text-sm text-white/80">This couldn&apos;t be loaded. It may have expired.</p>
        ) : messageType === "Video" ? (
          <video
            src={url}
            controls
            autoPlay
            playsInline
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            disableRemotePlayback
            onContextMenu={block}
            onError={() => setFailed(true)}
            className="max-h-full max-w-full"
          />
        ) : messageType === "VoiceNote" ? (
          <audio
            src={url}
            controls
            autoPlay
            controlsList="nodownload noremoteplayback"
            onContextMenu={block}
            onError={() => setFailed(true)}
            className="w-[min(90vw,24rem)]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="View once photo"
            draggable={false}
            onContextMenu={block}
            onDragStart={block}
            onError={() => setFailed(true)}
            className="max-h-full max-w-full select-none object-contain [-webkit-touch-callout:none]"
          />
        )}
      </FullscreenSheetContent>
    </FullscreenSheet>
  );
}
ViewOnceViewer.displayName = "ViewOnceViewer";
