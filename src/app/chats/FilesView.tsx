/* eslint-disable tailwindcss/no-custom-classname */
/* eslint-disable @next/next/no-img-element */
import { saveAs } from "file-saver";
import { Download, FileText, Share } from "lucide-react";
import React, { useEffect, useState } from "react";

import { DocCard } from "@/components/DocCard";
import ImageDiv from "@/components/imageDiv";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Attachment } from "@/lib/types/type";
import { cn, formatFileSize, updateLiveTime } from "@/lib/utils";
import VideoDiv from "@/templates/videoDiv";

const downloadFile = (url: string, filename: string) => {
  saveAs(url, filename);
};

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

export const MediaCollage = ({ media }: { media: (Attachment & { uploadedAt: string })[] }) => {
  const [mediaDialog, toggleMediaDialog] = useState({ open: false, index: 0 });
  const mediaLength = media.length;
  const moreThanFour = mediaLength > 4;
  const excess = mediaLength - 4;
  const mediaType = media.map((m) => m.type?.split("/")[0])[0];
  const isImage = mediaType === "image";

  return (
    <div className="w-full overflow-hidden rounded-xl">
      <MediaDialog files={media} mediaDialog={mediaDialog} toggleMediaDialog={toggleMediaDialog} />

      {isImage ? (
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
                <img src={m.url} alt={m.name} className="size-full object-cover" />
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
              <img src={media[3].url} alt={media[3].name} className="size-full object-cover" />
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

const MediaDialog = ({
  files,
  mediaDialog,
  toggleMediaDialog,
}: {
  files: Attachment[];
  mediaDialog: { open: boolean; index: number };
  toggleMediaDialog: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      index: number;
    }>
  >;
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(1);
  const [count, setCount] = useState(0);
  const showControls = files.length > 1;
  const activeFile = files[current - 1];

  useEffect(() => {
    if (!api) return;
    api.scrollTo(mediaDialog.index, true);
  }, [api, mediaDialog.index]);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <Dialog
      open={mediaDialog.open}
      onOpenChange={(open) => toggleMediaDialog((prev) => ({ ...prev, open }))}
    >
      <DialogTrigger className="hidden" />
      <DialogContent className="flex h-screen w-screen max-w-none flex-col justify-between gap-0 border-none bg-black/80 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6 text-white">{activeFile?.name || "Preview"}</DialogTitle>
          <DialogDescription className="text-xs font-medium text-gray-400">
            {current} / {count}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Carousel setApi={setApi} className="flex max-h-full w-full flex-1 items-center">
            <CarouselContent className="flex h-full max-h-full items-center">
              {files.map((file, key) => {
                const objectURL = file.url as string;
                const isImage = file.type?.startsWith("image/");
                const isVideo = file.type?.startsWith("video/");

                return (
                  <CarouselItem
                    key={key + file.name}
                    className="flex size-full items-center justify-center"
                  >
                    {isImage ? (
                      <ImageDiv media={objectURL} host={false} />
                    ) : isVideo ? (
                      <VideoDiv media={objectURL} host={false} />
                    ) : (
                      <DocCard className="w-auto" file={file} />
                    )}
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            {showControls && (
              <>
                <CarouselPrevious className="left-2 hidden border-0 bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 sm:flex" />
                <CarouselNext className="right-2 hidden border-0 bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 sm:flex" />
              </>
            )}
          </Carousel>
        </div>

        <DialogFooter className="items-center justify-center gap-2 sm:justify-center sm:space-x-0">
          <div className="flex w-full items-center justify-center gap-2 sm:max-w-96">
            <button
              type="button"
              disabled={!activeFile}
              className="group flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
              onClick={(e) => {
                e.preventDefault();
                if (activeFile) downloadFile(activeFile.url || "", activeFile.name);
              }}
            >
              <Download size={16} />
              <span>Download</span>
            </button>
            <button
              type="button"
              disabled={!activeFile}
              className="group flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              <Share size={16} />
              <span>Share</span>
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
