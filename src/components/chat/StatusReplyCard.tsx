/* eslint-disable @next/next/no-img-element */
"use client";

import { Image as ImageIcon, Mic, Video } from "lucide-react";
import React, { useState } from "react";
import { useSelector } from "react-redux";

import { StatusViewer } from "@/components/status/StatusViewer";
import { statusBackground } from "@/lib/statusBackgrounds";
import type { StatusReplyPreview } from "@/lib/types/status";
import { cn } from "@/lib/utils";
import type { RootState } from "@/redux/store";

const stop = (event: React.SyntheticEvent) => event.stopPropagation();

/** One line about what the status was. */
export function statusReplySummary(reply: StatusReplyPreview) {
  if (reply.mediaType === "text") return reply.text || "Text status";
  if (reply.caption) return reply.caption;
  if (reply.mediaType === "audio") return "Voice status";
  return reply.mediaType === "video" ? "Video status" : "Photo status";
}

/** The status a message replies to, above the reply. Tapping it opens the status while it is up. */
export function StatusReplyCard({
  reply,
  myId,
  own,
}: {
  reply: StatusReplyPreview;
  myId: string;
  /** The reply is in a bubble of the signed-in user's own colour. */
  own: boolean;
}) {
  const groups = useSelector((state: RootState) => state.status.groups);
  const [open, setOpen] = useState(false);
  const [now] = useState(() => Date.now());

  const groupIndex = groups.findIndex((group) =>
    group.statuses.some((status) => status._id === reply.statusId)
  );
  const statusIndex =
    groupIndex >= 0 ? groups[groupIndex].statuses.findIndex((s) => s._id === reply.statusId) : -1;
  const live = Date.parse(reply.expiresAt) > now && groupIndex >= 0;

  const title = reply.ownerId === myId ? "Replied to your status" : "Status";
  const bg = statusBackground(reply.background);

  const thumb =
    reply.mediaType === "text" ? (
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
        style={{ background: bg.css }}
        aria-hidden
      >
        Aa
      </div>
    ) : reply.mediaType === "audio" ? (
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-md bg-brand/20 text-brand"
        aria-hidden
      >
        <Mic className="size-5" />
      </div>
    ) : reply.thumbUrl ? (
      reply.mediaType === "video" ? (
        <video
          src={reply.thumbUrl}
          preload="metadata"
          muted
          className="size-12 shrink-0 rounded-md object-cover"
          aria-hidden
        />
      ) : (
        <img src={reply.thumbUrl} alt="" className="size-12 shrink-0 rounded-md object-cover" />
      )
    ) : (
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-md bg-black/10"
        aria-hidden
      >
        {reply.mediaType === "video" ? (
          <Video className="size-5" />
        ) : (
          <ImageIcon className="size-5" />
        )}
      </div>
    );

  return (
    <>
      <button
        type="button"
        disabled={!live}
        onClick={() => setOpen(true)}
        aria-label={live ? `${title}. Open status` : `${title}. This status has expired`}
        className={cn(
          "mb-1.5 flex w-full min-w-[12rem] items-center gap-2 overflow-hidden rounded-lg border-l-4 border-brand p-1.5 text-left",
          own ? "bg-black/10 dark:bg-white/10" : "bg-gray-100 dark:bg-zinc-700/60",
          live ? "cursor-pointer hover:opacity-90" : "cursor-default opacity-80"
        )}
      >
        {thumb}
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-brand">{title}</span>
          <span className="line-clamp-2 break-words text-xs opacity-80">
            {statusReplySummary(reply)}
          </span>
          {!live && <span className="block text-[11px] italic opacity-70">Status expired</span>}
        </span>
      </button>
      {open && live && (
        // The viewer is drawn on top of the page, but in React's tree it is still inside the
        // message, so touches in it would otherwise reach the message's long-press and click handlers.
        <div
          onClick={stop}
          onPointerDown={stop}
          onTouchStart={stop}
          onTouchEnd={stop}
          onContextMenu={stop}
        >
          <StatusViewer
            groups={[groups[groupIndex]]}
            initialGroupIndex={0}
            initialStatusIndex={statusIndex}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}
