/* eslint-disable @next/next/no-img-element */
import { Download, FileText } from "lucide-react";
import React, { useState } from "react";

import { AudioFileCard } from "@/components/chat/AudioFileCard";
import { CachedMedia } from "@/components/chat/CachedMedia";
import { MediaViewer } from "@/components/chat/MediaViewer";
import { VoiceNotePlayer } from "@/components/VoiceNotePlayer";
import { isVoiceNoteName } from "@/lib/voiceNote";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/downloadFile";
import { Attachment } from "@/lib/types/type";
import { cn, formatFileSize, updateLiveTime } from "@/lib/utils";

// Resolve a friendly extension label + theme from a MIME subtype.
const fileMeta = (subtype?: string) => {
  if (!subtype) return { label: "FILE", icon: "text-gray-500", chip: "bg-gray-500/10" };

  let ext = subtype;
  if (subtype.startsWith("vnd.openxmlformats-officedocument.wordprocessingml")) ext = "docx";
  else if (subtype.startsWith("vnd.openxmlformats-officedocument.spreadsheetml")) ext = "xlsx";
  else if (subtype.startsWith("vnd.openxmlformats-officedocument.presentationml")) ext = "pptx";
  else if (subtype.includes(".")) ext = subtype.split(".").pop() || subtype;

  const label = ext.toUpperCase();

  switch (ext) {
    case "pdf":
      return { label, icon: "text-red-500", chip: "bg-red-500/10" };
    case "doc":
    case "docx":
      return { label, icon: "text-blue-500", chip: "bg-blue-500/10" };
    case "xls":
    case "xlsx":
    case "csv":
      return { label, icon: "text-green-500", chip: "bg-green-500/10" };
    case "ppt":
    case "pptx":
      return { label, icon: "text-orange-500", chip: "bg-orange-500/10" };
    case "zip":
    case "rar":
    case "7z":
      return { label, icon: "text-amber-500", chip: "bg-amber-500/10" };
    default:
      return { label, icon: "text-gray-500", chip: "bg-gray-500/10" };
  }
};

type MediaCollageProps = {
  media: (Attachment & { uploadedAt: string })[];
  /** A recorded voice note (gets the compact player); other audio is shown as a file. */
  voiceNote?: boolean;
};

const MediaCollage = ({ media, voiceNote = false }: MediaCollageProps) => {
  const [mediaDialog, toggleMediaDialog] = useState({ open: false, index: 0 });
  const mediaLength = media.length;
  const moreThanFour = mediaLength > 4;
  const excess = mediaLength - 4;
  const mediaType = media.map((m) => m.type?.split("/")[0])[0];
  const isImage = mediaType === "image";
  // Voice notes sent before the VoiceNote type existed are recognised by their name.
  const isAudio = mediaType === "audio" && (voiceNote || media.every((m) => isVoiceNoteName(m.name)));

  return (
    <div className="w-full overflow-hidden rounded-xl">
      <MediaDialogComponent files={media} mediaDialog={mediaDialog} toggleMediaDialog={toggleMediaDialog} />

      {isAudio ? (
        <div className="flex flex-col gap-1 rounded-xl bg-white px-3 py-1 shadow-sm dark:bg-zinc-800 dark:text-white">
          {media.map((m) => (
            <VoiceNotePlayer key={m.name} url={m.url || ""} name={m.name} />
          ))}
        </div>
      ) : mediaType === "audio" ? (
        <div className="flex flex-col gap-2">
          {media.map((m) => (
            <AudioFileCard
              key={m.name}
              url={m.url || ""}
              name={m.name}
              size={m.size}
              onDownload={() => downloadFile(m.url || "", m.name)}
            />
          ))}
        </div>
      ) : isImage ? (
        <div className={cn("grid gap-1.5", mediaLength === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {media.map((m, key) => {
            if (moreThanFour && key > 2) return null;

            const single = mediaLength === 1;
            const wideThird = key === 2 && mediaLength === 3;

            return (
              <button
                type="button"
                key={m.name}
                onClick={() => toggleMediaDialog({ open: true, index: key })}
                className={cn(
                  "group relative cursor-pointer overflow-hidden rounded-xl bg-gray-100 transition hover:ring-2 hover:ring-brand/60 dark:bg-neutral-800",
                  single ? "aspect-video" : wideThird ? "col-span-2 aspect-video" : "aspect-square"
                )}
              >
                <CachedMedia url={m.url} kind="image">
                  {(src, save) => (
                    <img src={src} alt={m.name} onLoad={save} className="size-full object-cover" />
                  )}
                </CachedMedia>
                <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
                  {updateLiveTime("chat-time", m.uploadedAt)}
                </span>
              </button>
            );
          })}

          {moreThanFour && (
            <button
              type="button"
              onClick={() => toggleMediaDialog({ open: true, index: 3 })}
              className="relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-gray-100 transition hover:ring-2 hover:ring-brand/60 dark:bg-neutral-800"
            >
              <CachedMedia url={media[3].url} kind="image">
                {(src, save) => (
                  <img src={src} alt={media[3].name} onLoad={save} className="size-full object-cover" />
                )}
              </CachedMedia>
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xl font-semibold text-white backdrop-blur-sm">
                +{excess}
              </div>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {media.map((m) => {
            const [, subtype] = m.type?.split("/") || [];
            const { label, icon, chip } = fileMeta(subtype);

            return (
              <div
                key={m.name}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700/70"
              >
                <div
                  className={cn(
                    "relative flex size-11 shrink-0 items-center justify-center rounded-lg",
                    chip
                  )}
                >
                  <FileText className={icon} size={22} />
                  <span className="absolute -right-1.5 -top-1.5 rounded-md border border-gray-200 bg-white px-1 text-[9px] font-semibold text-gray-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-300">
                    {label}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {m.name}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {m.size && (
                      <>
                        <span>{formatFileSize(m.size)}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{updateLiveTime("chat-time", m.uploadedAt)}</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Download file"
                  className="shrink-0"
                  onClick={(e) => {
                    e.preventDefault();
                    downloadFile(m.url || "", m.name);
                  }}
                >
                  <Download size={16} />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

MediaCollage.displayName = "MediaCollage";

type MediaDialogProps = {
  files: Attachment[];
  mediaDialog: { open: boolean; index: number };
  toggleMediaDialog: React.Dispatch<React.SetStateAction<{ open: boolean; index: number }>>;
};

const MediaDialogComponent = ({ files, mediaDialog, toggleMediaDialog }: MediaDialogProps) => (
  <MediaViewer
    files={files}
    open={mediaDialog.open}
    index={mediaDialog.index}
    onOpenChange={(open) => toggleMediaDialog((prev) => ({ ...prev, open }))}
  />
);

MediaDialogComponent.displayName = "MediaDialogComponent";

export { MediaCollage, MediaDialogComponent };