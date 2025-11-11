"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Pin, Bell, Loader2, Trash2, Archive, Image, FileText, Link as LinkIcon, ChevronRight } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { Switch, Slider } from "@/components/ui";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import ChatRepository from "@/lib/class/ChatRepository";
import ChatSystem from "@/lib/class/chatSystem";
import { ChatSettings, MessageAttributes, NewChatSettings, Attachment } from "@/lib/types/type";
import { ConvoType, updateConversation } from "@/redux/chatSlice";
import { RootState } from "@/redux/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Statuser } from "@/components/VerificationComponent";
import { useSocket } from "@/app/providers/SocketProvider";
import { useAppDispatch } from "@/redux/hooks";
import { Time } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface Params {
  gid?: string;
}

interface ChatSetting {
  [x: string]: NewChatSettings;
}

interface CHT {
  messages: MessageAttributes[];
  settings: ChatSetting;
  conversations: ConvoType[];
  loading: boolean;
}

const chatRepository = new ChatRepository();

const chatSystem = new ChatSystem(chatRepository);

const ChatSettingsPage: React.FC = () => {
  const router = useRouter();
  const navigate = useNavigateWithHistory();
  const params = useParams() as Params;
  const { gid } = params;
  const {
    conversations,
    settings,
    messages,
    loading: convoLoading,
  } = useSelector<RootState, CHT>((state) => state.chat);
  const [chatSettings, setChatSettings] = useState<NewChatSettings | undefined>(undefined);
  const convo = useMemo(() => conversations?.find((c) => c.id === gid) as ConvoType, [conversations, gid]);
  const { userdata } = useSelector((state: RootState) => state.user);
  const socket = useSocket();
  const dispatch = useAppDispatch();
  // Extract URLs from message content
  const extractUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  // Get preview data for media, docs, and links
  const previewData = useMemo(() => {
    const chatMessages = (messages?.filter((msg) => msg.chatId === gid) as MessageAttributes[]) || [];
    
    // Sort messages by timestamp (most recent first)
    const sortedMessages = [...chatMessages].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    // Get media (images/videos) - latest 4
    const mediaItems: Array<{ attachment: Attachment; message: MessageAttributes }> = [];
    sortedMessages.forEach((msg) => {
      msg.attachments?.forEach((att) => {
        const type = att.type?.split("/")[0];
        if ((type === "image" || type === "video") && mediaItems.length < 4) {
          mediaItems.push({ attachment: att, message: msg });
        }
      });
    });
    
    // Get documents - latest 3
    const docItems: Array<{ attachment: Attachment; message: MessageAttributes }> = [];
    sortedMessages.forEach((msg) => {
      msg.attachments?.forEach((att) => {
        const type = att.type?.split("/")[0];
        if (type !== "image" && type !== "video" && type !== "audio" && docItems.length < 3) {
          docItems.push({ attachment: att, message: msg });
        }
      });
    });
    
    // Get links - latest 3
    const linkItems: Array<{ url: string; message: MessageAttributes }> = [];
    sortedMessages.forEach((msg) => {
      if (msg.content) {
        const urls = extractUrls(msg.content);
        urls.forEach((url) => {
          if (linkItems.length < 3) {
            linkItems.push({ url, message: msg });
          }
        });
      }
    });
    
    // Count totals
    let mediaCount = 0;
    let docCount = 0;
    let linkCount = 0;
    
    chatMessages.forEach((msg) => {
      msg.attachments?.forEach((att) => {
        const type = att.type?.split("/")[0];
        if (type === "image" || type === "video") {
          mediaCount++;
        } else if (type !== "audio") {
          docCount++;
        }
      });
      if (msg.content) {
        const urls = extractUrls(msg.content);
        linkCount += urls.length;
      }
    });
    
    return {
      media: mediaItems.slice(0, 4),
      docs: docItems.slice(0, 3),
      links: linkItems.slice(0, 3),
      counts: { media: mediaCount, docs: docCount, links: linkCount },
    };
  }, [messages, gid]);

  useEffect(() => {
    if (!convoLoading) {
      const chatSettings = settings?.[gid as string];
      if (chatSettings) {
        setChatSettings(prev => ({ ...prev, ...chatSettings, isPinned: convo?.pinned || false, isArchived: convo?.archived || false }));
      }
    }
  }, [gid, convoLoading, settings]);

  const handleSettingsChange = async (field: keyof ChatSettings, value: any) => {
    if (chatSettings) {
      setChatSettings({ ...chatSettings, [field]: value });
      if (field === "isMuted") {
        return;
      } else if (field === "isPinned") {
        dispatch(updateConversation({ id: gid as string, updates: { pinned: value } }));
      } else if (field === "isArchived") {
        dispatch(updateConversation({ id: gid as string, updates: { archived: value } }));
      }
      socket?.emit("updateConversation", {
        id: gid,
        updates: { [field]: value, userId: userdata._id },
      });
    }
  };

  if (!convo || !chatSettings) {
    return (
      <div
        className={`absolute z-10 flex size-full flex-col items-center justify-center bg-white tablets1:z-[unset] tablets1:w-1/2 dark:bg-black dark:text-slate-200`}
      >
        <div className="absolute top-0 flex w-full items-center justify-between gap-4 border-b bg-gray-100 p-2 dark:bg-zinc-900 dark:text-slate-200">
          <div className="flex items-center justify-start gap-4">
            <FontAwesomeIcon
              onClick={() => navigate()}
              icon={"arrow-left"}
              className="icon-arrow-left max-h-[21px] cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              size="lg"
            />
            <h2 className="font-bold">Chat Settings</h2>
          </div>
          <Trash2
            className="max-h-[21px] cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={() => router.push(`/chats/group/${params?.gid}/settings`)}
          />
        </div>
        <Loader2
          className="max-h-[21px] animate-spin cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          size={21}
        />
      </div>
    );
  }

  return (
    <div
      className={`absolute z-10 flex size-full overflow-y-auto max-h-screen min-h-screen flex-1 flex-col overflow-hidden rounded-lg bg-white shadow-md tablets1:w-1/2 tablets1:bg-white dark:bg-black`}
    >
      <div className="sticky top-0 z-10 min-h-12 flex items-center justify-between gap-4 bg-gray-100 px-3 py-2 dark:bg-zinc-900 dark:text-slate-200">
        <div className="flex items-center justify-start gap-4">
          <FontAwesomeIcon
            onClick={() => navigate()}
            icon={"arrow-left"}
            className="icon-arrow-left max-h-[21px] cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            size="lg"
          />
          <h2 className="font-bold">Chat Settings</h2>
        </div>
        <Trash2
          className="max-h-[21px] cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={() => router.push(`/chats/group/${params?.gid}/settings`)}
        />
      </div>

      <div className="m-2 space-y-4">
        <Card className="mx-auto mt-2 max-w-md rounded-lg border bg-white shadow-md dark:border-zinc-700 dark:bg-zinc-900">
          <CardHeader className="flex flex-col items-center justify-center p-4">
            <div className="relative mb-2">
              <Avatar className="size-24 border-2 border-white shadow-md dark:border-black" data-src={convo?.displayPicture}>
                <AvatarFallback className="capitalize text-xl">
                  {convo?.name?.slice(0, 2).toUpperCase() || ""}
                </AvatarFallback>
                <AvatarImage
                  src={convo?.displayPicture}
                  className="displayPicture size-24 rounded-full object-cover"
                  width={96}
                  height={96}
                  alt="Display Picture"
                />
              </Avatar>
              {convo?.verified && (
                <div className="absolute bottom-1 right-1 mr-2">
                  <Statuser className="size-4" />
                </div>
              )}
            </div>
            <h2 className="mt-2 mb-0 text-lg font-bold text-gray-900 dark:text-slate-100">{convo?.name}</h2>
            <span className="mt-1 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-zinc-800 dark:text-gray-400">
              Group ID: {convo?.id}
            </span>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="mb-1 text-center text-sm text-gray-500 dark:text-slate-400">{convo?.description || <span className="italic text-gray-400">No description</span>}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              <span className="rounded bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                {convo?.participants.length} members
              </span>
              <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100">
                {convo?.adminIds.length} admins
              </span>
            </div>
            <div className="mt-2 flex flex-col items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
              <div>
                <span className="font-medium text-gray-500 dark:text-slate-400">Date created: </span>
                {Time(convo?.timestamp)}
              </div>
              <div>
                <span className="font-medium text-gray-500 dark:text-slate-400">Last updated: </span>
                {Time(convo?.lastUpdated)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media, Docs, and Links Sneak Peek */}
        <div className="space-y-3 rounded-lg border bg-gray-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Media, Links & Docs</h3>
            <button
              onClick={() => router.push(`/chats/group/${gid}/media`)}
              className="flex items-center gap-1 text-xs text-brand hover:underline"
            >
              See all
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Media Preview */}
          {previewData.media.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Image size={14} />
                <span>Media ({previewData.counts.media})</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {previewData.media.map(({ attachment }, index) => {
                  const [type] = attachment.type?.split("/") || [];
                  const isImage = type === "image";
                  const isVideo = type === "video";
                  
                  return (
                    <div
                      key={index}
                      className="relative aspect-square overflow-hidden rounded bg-gray-200 dark:bg-zinc-800"
                    >
                      {isImage && attachment.url ? (
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="size-full object-cover"
                        />
                      ) : isVideo && attachment.url ? (
                        <>
                          <video
                            src={attachment.url}
                            className="size-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="rounded-full bg-black/50 p-1">
                              <svg
                                className="size-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                              </svg>
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Docs Preview */}
          {previewData.docs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <FileText size={14} />
                <span>Documents ({previewData.counts.docs})</span>
              </div>
              <div className="space-y-1">
                {previewData.docs.slice(0, 2).map(({ attachment }, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded bg-white p-2 text-xs dark:bg-zinc-800"
                  >
                    <FileText size={16} className="text-brand" />
                    <span className="truncate text-gray-700 dark:text-gray-300">{attachment.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links Preview */}
          {previewData.links.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <LinkIcon size={14} />
                <span>Links ({previewData.counts.links})</span>
              </div>
              <div className="space-y-1">
                {previewData.links.slice(0, 2).map(({ url }, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded bg-white p-2 text-xs dark:bg-zinc-800"
                  >
                    <LinkIcon size={16} className="text-blue-600 dark:text-blue-400" />
                    <span className="truncate text-gray-700 dark:text-gray-300">{url}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewData.media.length === 0 && previewData.docs.length === 0 && previewData.links.length === 0 && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">No media, links, or documents yet</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="mute" className="flex items-center gap-2 text-gray-700 dark:text-slate-200">
            <Bell className="size-4" />
            Notifications
          </label>
          <Switch
            id="mute"
            checked={chatSettings.isMuted}
            onChange={(value: any) => handleSettingsChange("isMuted", value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="pin" className="flex items-center gap-2 text-gray-700 dark:text-slate-200">
            <Pin className="size-4" />
            Pin
          </label>
          <Switch
            id="pin"
            checked={chatSettings.isPinned}
            onChange={(value: any) => handleSettingsChange("isPinned", value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="archive" className="flex items-center gap-2 text-gray-700 dark:text-slate-200">
            <Archive className="size-4" />
            Archive
          </label>
          <Switch
            id="archive"
            checked={chatSettings.isArchived}
            onChange={(value: any) => handleSettingsChange("isArchived", value)}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatSettingsPage;
