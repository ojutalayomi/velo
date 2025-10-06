/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable tailwindcss/no-custom-classname */
/* eslint-disable @next/next/no-img-element */
import { saveAs } from "file-saver";
import { ChevronDown, ChevronUp, Download, File, Share } from "lucide-react";
import React, { useEffect, useState } from "react";

import { DocCard } from "@/components/DocCard";
import ImageDiv from "@/components/imageDiv";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  CarouselApi,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Attachment } from "@/lib/types/type";
import VideoDiv from "@/templates/videoDiv";

const downloadFile = (url: string, filename: string) => {
  saveAs(url, filename);
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const MediaCollage = ({ media }: { media: Attachment[] }) => {
  const [mediaDialog, toggleMediaDialog] = useState({ open: false, index: 0 });
  const mediaLength = media.length;
  const moreThanFour = mediaLength > 4;
  const excess = mediaLength - 4;
  const mediaType = media.map((m) => m.type.split("/")[0])[0];
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fileColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "pdf":
        return "red-500";
      case "doc":
      case "docx":
        return "blue-500";
      case "xls":
      case "xlsx":
      case "csv":
        return "green-500";
      case "ppt":
      case "pptx":
        return "orange-500";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return "purple-500";
      case "mp4":
      case "avi":
      case "mov":
        return "pink-500";
      case "mp3":
      case "wav":
        return "yellow-500";
      default:
        return "gray-500";
    }
  };

  return (
    <div
      className={`w-full ${mediaType === "image" ? "bg-gray-100" : "bg-transparent"} overflow-hidden rounded-lg dark:bg-zinc-800`}
    >
      {/* <div className="p-4 text-xs border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-pink-400">~Dara🤫</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-400">+234 708 933 73</span>
                    <ChevronDown className="text-gray-400 transform transition hover:rotate-180"/>
                </div>
            </div> */}
      <MediaDialog files={media} mediaDialog={mediaDialog} toggleMediaDialog={toggleMediaDialog} />
      {mediaType === "image" ? (
        <div className="grid grid-cols-2 gap-2 p-2 text-xs">
          {media.map((m, key) => {
            if (moreThanFour && key > 2) return null;
            return (
              <div
                key={m.name}
                onClick={() => toggleMediaDialog({ open: true, index: key })}
                className={`${key === 2 && mediaLength === 3 ? "col-span-2 row-span-1 aspect-video" : "aspect-square"} ${mediaLength === 1 && "col-span-2"} group relative cursor-pointer overflow-hidden rounded-lg bg-white transition hover:ring-2 hover:ring-gray-300`}
              >
                <img src={m.url} alt={m.name} className="size-full object-cover" />
                {/* <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-white">8:21 PM</div> */}
              </div>
            );
          })}
          {moreThanFour && (
            <div onClick={() => toggleMediaDialog({ open: true, index: 3 })} className="relative">
              <div className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-white transition hover:ring-2 hover:ring-gray-300">
                <img src={media[3].url} alt={media[3].name} className="size-full object-cover" />
                {/* <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-white text-sm">8:21 PM</div> */}
              </div>
              <div className="group absolute inset-0 flex aspect-square items-center justify-center rounded-lg text-2xl font-light text-gray-400 backdrop-blur-sm transition hover:bg-gray-700">
                +{excess}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-1">
          {media.map((m) => {
            const type = m.type.split("/")[1];
            const type1 = () => {
              if (type === "vnd.openxmlformats-officedocument.wordprocessingml.document") {
                return "docx";
              } else if (type === "vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
                return "xlxs";
              }
              return type;
            };
            const clr = fileColor(type1());
            return (
              <div
                key={m.name}
                // onClick={() => toggleMediaDialog({open: true, index: key})}
                className={`group flex items-center gap-2 overflow-hidden rounded-lg bg-gray-100 p-2 text-xs shadow-lg transition hover:ring-1 hover:ring-gray-300 dark:bg-neutral-950`}
              >
                <div
                  aria-label={m.name}
                  className="relative flex aspect-square items-center justify-center rounded-lg p-2 shadow-md dark:bg-zinc-800"
                >
                  <div
                    className={`text- absolute bg-gray-100${clr} -right-1.5 top-0 rounded-lg border p-1 text-xs dark:bg-neutral-950`}
                  >
                    {type1()?.toUpperCase()}
                  </div>
                  <File className={`text-${clr}`} size={40} />
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400">{m.name}</span>
                  {m.size && (
                    <span className="text-xs text-gray-500">{formatFileSize(m.size)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      {isDropdownOpen ? (
                        <ChevronDown className="text-gray-400" />
                      ) : (
                        <ChevronUp className="text-gray-400" />
                      )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="mr-2 w-auto p-2">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded p-2 hover:bg-gray-100 dark:hover:bg-zinc-700"
                        onClick={(e) => {
                          e.preventDefault();
                          downloadFile(m.url || "", m.name);
                        }}
                      >
                        <Download size={16} className="text-gray-400" />
                        <span className="text-gray-400">Download</span>
                      </button>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (!api) return;
    api.scrollTo(mediaDialog.index, true);
  }, [api, mediaDialog.index]);

  useEffect(() => {
    if (!api) {
      return;
    }

    // Update count and current slide position
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    // Listen for slide changes
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  // Only show controls if there are multiple media items
  useEffect(() => {
    if (files.length > 1) {
      setShowControls(true);
    }
  }, [files]);

  return (
    <Dialog
      open={mediaDialog.open}
      onOpenChange={() => {
        if (mediaDialog) {
          toggleMediaDialog({ ...mediaDialog, open: !mediaDialog });
        }
      }}
    >
      <DialogTrigger className="hidden"></DialogTrigger>
      <DialogContent className="flex h-screen w-screen max-w-none flex-col justify-evenly gap-0 border-none bg-transparent backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white">Preview</DialogTitle>
          <DialogDescription className="text-sm font-medium text-white">
            Files ({current}/{count})
          </DialogDescription>
        </DialogHeader>
        <div className="flex h-full max-h-[85%] flex-1 rounded-md shadow-xl backdrop-blur-xl">
          {files && (
            <Carousel setApi={setApi} className="flex max-h-full w-full flex-1 items-center">
              <CarouselContent className="flex h-full max-h-full gap-2 sm:aspect-auto">
                {files.map((file, key) => {
                  const objectURL = file.url as string;
                  const [_, fileType] = file.type.split("/");
                  // console.log(fileType)
                  const isImage = fileType === "png" || fileType === "jpeg" || fileType === "jpeg";
                  const isVideo = fileType === "mp4" || fileType === "mov" || fileType === "mkv";

                  return (
                    <CarouselItem
                      key={key + file.name}
                      className="flex size-full items-center justify-center"
                    >
                      {
                        isImage ? (
                          <ImageDiv media={objectURL} host={false} />
                        ) : isVideo ? (
                          <VideoDiv media={objectURL} host={false} />
                        ) : (
                          <DocCard className="w-auto" file={file} />
                        )
                        // <></>
                      }
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              {showControls && (
                <>
                  <CarouselPrevious className="left-2 hidden sm:flex" />
                  <CarouselNext className="right-2 hidden sm:flex" />
                </>
              )}
            </Carousel>
          )}
        </div>
        <DialogFooter className="!flex-col items-center gap-2">
          {/* Total Size Indicator */}
          <div className="text-sm text-white dark:text-gray-600">
            {/* Total Size: {formatFileSize(files.reduce((acc, file) => acc + file.size, 0))} */}
          </div>
          <div className="flex w-full flex-1 items-center justify-between gap-2 sm:max-w-96">
            <button
              type="button"
              className="group flex items-center gap-3 rounded px-2 py-3"
              onClick={(e) => {
                e.preventDefault();
                downloadFile(files[current].url || "", files[current].name);
              }}
            >
              <Download size={16} className="text-gray-400 group-hover:text-green-500" />
              <span className="text-gray-400 group-hover:text-green-500">Download</span>
            </button>
            <button
              type="button"
              className="group flex items-center gap-3 rounded px-2 py-3"
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              <Share size={16} className="text-gray-400 group-hover:text-green-500" />
              <span className="text-gray-400 group-hover:text-green-500">Share</span>
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
