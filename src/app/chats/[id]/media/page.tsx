/* eslint-disable tailwindcss/no-custom-classname */
"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Download, ExternalLink, FileText, Image, Link as LinkIcon, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";

import ImageDiv from "@/components/imageDiv";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import { Attachment, MessageAttributes } from "@/lib/types/type";
import { formatFileSize, updateLiveTime } from "@/lib/utils";
import { ConvoType } from "@/redux/chatSlice";
import { RootState } from "@/redux/store";
import VideoDiv from "@/templates/videoDiv";
import { saveAs } from "file-saver";

interface Params {
  id?: string;
}

const extractUrls = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

const downloadFile = (url: string, filename: string) => {
  saveAs(url, filename);
};

// Helper function to format date for grouping
const formatDateForGrouping = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Helper function to group items by date
const groupByDate = <T extends { message: MessageAttributes }>(
  items: T[]
): Array<{ date: string; items: T[]; timestamp: string }> => {
  const grouped = new Map<string, { items: T[]; timestamp: string }>();

  items.forEach((item) => {
    const date = formatDateForGrouping(item.message.timestamp);
    if (!grouped.has(date)) {
      grouped.set(date, { items: [], timestamp: item.message.timestamp });
    }
    grouped.get(date)!.items.push(item);
  });

  return Array.from(grouped.entries())
    .map(([date, data]) => ({ date, items: data.items, timestamp: data.timestamp }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const DateChip: React.FC<{ date: string }> = ({ date }) => (
  <div className="sticky top-0 z-10 my-2 text-center">
    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 shadow-sm dark:bg-neutral-800 dark:text-gray-400">
      {date}
    </span>
  </div>
);

const MediaPage: React.FC = () => {
  const navigate = useNavigateWithHistory();
  const params = useParams() as Params;
  const { id } = params;
  const { messages, conversations } = useSelector((state: RootState) => state.chat);
  const [selectedMedia, setSelectedMedia] = useState<{ open: boolean; media: Attachment | null }>({
    open: false,
    media: null,
  });

  const convo = useMemo(
    () => conversations?.find((c) => c.id === id) as ConvoType,
    [conversations, id]
  );

  // Filter messages for this chat and sort by timestamp (most recent first)
  const chatMessages = useMemo(() => {
    const filtered = (messages?.filter((msg) => msg.chatId === id) as MessageAttributes[]) || [];
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [messages, id]);

  // Filter media (images and videos)
  const mediaMessages = useMemo(() => {
    return chatMessages.filter((msg) =>
      msg.attachments?.some((att) => {
        const type = att.type?.split("/")[0];
        return type === "image" || type === "video";
      })
    );
  }, [chatMessages]);

  // Filter documents
  const docMessages = useMemo(() => {
    return chatMessages.filter((msg) =>
      msg.attachments?.some((att) => {
        const type = att.type?.split("/")[0];
        return type !== "image" && type !== "video" && type !== "audio";
      })
    );
  }, [chatMessages]);

  // Filter links
  const linkMessages = useMemo(() => {
    return chatMessages.filter((msg) => !!msg.content && extractUrls(msg.content).length > 0);
  }, [chatMessages]);

  // Get all media items
  const allMedia = useMemo(() => {
    const media: Array<{ attachment: Attachment; message: MessageAttributes }> = [];
    mediaMessages.forEach((msg) => {
      msg.attachments?.forEach((att) => {
        const type = att.type?.split("/")[0];
        if (type === "image" || type === "video") {
          media.push({ attachment: att, message: msg });
        }
      });
    });
    return media; // Already sorted by most recent first
  }, [mediaMessages]);

  // Get all documents
  const allDocs = useMemo(() => {
    const docs: Array<{ attachment: Attachment; message: MessageAttributes }> = [];
    docMessages.forEach((msg) => {
      msg.attachments?.forEach((att) => {
        const type = att.type?.split("/")[0];
        if (type !== "image" && type !== "video" && type !== "audio") {
          docs.push({ attachment: att, message: msg });
        }
      });
    });
    return docs; // Already sorted by most recent first
  }, [docMessages]);

  // Get all links
  const allLinks = useMemo(() => {
    const links: Array<{ url: string; message: MessageAttributes }> = [];
    linkMessages.forEach((msg) => {
      extractUrls(msg.content).forEach((url) => {
        links.push({ url, message: msg });
      });
    });
    return links; // Already sorted by most recent first
  }, [linkMessages]);

  // Group items by date
  const groupedMedia = useMemo(() => groupByDate(allMedia), [allMedia]);
  const groupedDocs = useMemo(() => groupByDate(allDocs), [allDocs]);
  const groupedLinks = useMemo(() => groupByDate(allLinks), [allLinks]);

  if (!convo) {
    return (
      <div className="absolute z-10 flex size-full flex-col bg-gray-50 tablets1:w-1/2 dark:bg-neutral-900">
        <header className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate()}
              aria-label="Go back"
              className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800"
            >
              <FontAwesomeIcon icon={"arrow-left"} size="lg" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Media</h1>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute z-10 flex size-full max-h-screen min-h-screen flex-1 flex-col overflow-hidden rounded-lg bg-gray-50 shadow-md tablets1:w-1/2 dark:bg-neutral-900">
      <header className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate()}
            aria-label="Go back"
            className="shrink-0 rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800"
          >
            <FontAwesomeIcon icon={"arrow-left"} size="lg" />
          </button>
          <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
            {convo?.name}
          </h1>
        </div>
      </header>

      <Tabs defaultValue="media" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 grid w-auto grid-cols-3">
          <TabsTrigger value="media" className="flex items-center gap-2">
            <Image size={16} />
            Media ({allMedia.length})
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <FileText size={16} />
            Docs ({allDocs.length})
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center gap-2">
            <LinkIcon size={16} />
            Links ({allLinks.length})
          </TabsTrigger>
        </TabsList>

        {/* Media Tab */}
        <TabsContent value="media" className="flex-1 overflow-y-auto p-4">
          {allMedia.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              <p>No media files</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedMedia.map(({ date, items }) => (
                <div key={date} className="space-y-3">
                  <DateChip date={date} />
                  <div className="grid grid-cols-3 gap-2">
                    {items.map(({ attachment, message }, index) => {
                      const [type] = attachment.type?.split("/") || [];
                      const isImage = type === "image";
                      const isVideo = type === "video";
                      const uploadedAt =
                        (attachment as Attachment & { uploadedAt?: string }).uploadedAt ||
                        message.timestamp;

                      return (
                        <button
                          type="button"
                          key={`${message._id}-${index}`}
                          onClick={() => setSelectedMedia({ open: true, media: attachment })}
                          className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100 transition hover:ring-2 hover:ring-brand/60 dark:bg-neutral-800"
                        >
                          {isImage ? (
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className="size-full object-cover"
                            />
                          ) : isVideo ? (
                            <>
                              <video src={attachment.url} className="size-full object-cover" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="rounded-full bg-black/50 p-2 transition group-hover:bg-black/70">
                                  <svg
                                    className="size-6 text-white"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                  </svg>
                                </div>
                              </div>
                            </>
                          ) : null}
                          <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                            {updateLiveTime("chat-time", uploadedAt)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Docs Tab */}
        <TabsContent value="docs" className="flex-1 overflow-y-auto p-4">
          {allDocs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              <p>No documents</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedDocs.map(({ date, items }) => (
                <div key={date} className="space-y-3">
                  <DateChip date={date} />
                  <div className="space-y-2">
                    {items.map(({ attachment, message }, index) => {
                      const [, subtype] = attachment.type?.split("/") || [];
                      const uploadedAt =
                        (attachment as Attachment & { uploadedAt?: string }).uploadedAt ||
                        message.timestamp;

                      return (
                        <div
                          key={`${message._id}-${index}`}
                          className="flex items-center gap-3 rounded-xl border bg-white p-3 transition hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700/70"
                        >
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                            <FileText className="text-brand" size={22} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                              {attachment.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              {attachment.size && (
                                <>
                                  <span>{formatFileSize(attachment.size)}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span>{subtype?.split(".").pop()?.toUpperCase() || "FILE"}</span>
                              <span>•</span>
                              <span>{updateLiveTime("chat-time", uploadedAt)}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Download document"
                            onClick={() => downloadFile(attachment.url || "", attachment.name)}
                            className="shrink-0"
                          >
                            <Download size={16} />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Links Tab */}
        <TabsContent value="links" className="flex-1 overflow-y-auto p-4">
          {allLinks.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              <p>No links</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedLinks.map(({ date, items }) => (
                <div key={date} className="space-y-3">
                  <DateChip date={date} />
                  <div className="space-y-2">
                    {items.map(({ url, message }, index) => (
                      <div
                        key={`${message._id}-${index}`}
                        className="flex items-center gap-3 rounded-xl border bg-white p-3 transition hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700/70"
                      >
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <LinkIcon className="text-blue-600 dark:text-blue-400" size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {url}
                          </a>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {updateLiveTime("chat-time", message.timestamp)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Open link"
                          onClick={() => window.open(url, "_blank")}
                          className="shrink-0"
                        >
                          <ExternalLink size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Media Preview Dialog */}
      <Dialog
        open={selectedMedia.open}
        onOpenChange={(open) => setSelectedMedia({ open, media: null })}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{selectedMedia.media?.name}</DialogTitle>
          </DialogHeader>
          {selectedMedia.media && (
            <div className="flex max-h-[70vh] items-center justify-center overflow-hidden">
              {selectedMedia.media.type?.startsWith("image/") ? (
                <ImageDiv media={selectedMedia.media.url || ""} host={false} />
              ) : selectedMedia.media.type?.startsWith("video/") ? (
                <VideoDiv media={selectedMedia.media.url || ""} host={false} />
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaPage;
