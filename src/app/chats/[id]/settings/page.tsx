/* eslint-disable tailwindcss/no-custom-classname */
"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Archive, BellOff, BellRing, ChevronRight, FileText, Image, Link as LinkIcon, Loader2, Moon, Pin, Sun, Trash2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { Switch, Slider } from "@/components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Statuser } from "@/components/VerificationComponent";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import ChatRepository from "@/lib/class/ChatRepository";
import ChatSystem from "@/lib/class/chatSystem";
import {
  Attachment,
  ChatDataClient,
  ChatSettings,
  MessageAttributes,
  NewChatSettings,
} from "@/lib/types/type";
import { ConvoType } from "@/redux/chatSlice";
import { RootState } from "@/redux/store";

interface Params {
  id?: string;
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

const SectionCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="divide-y overflow-hidden rounded-xl bg-white shadow-sm dark:divide-neutral-700 dark:bg-neutral-800">
    {children}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
    {children}
  </h2>
);

const ChatSettingsPage: React.FC = () => {
  const router = useRouter();
  const params = useParams() as Params;
  const navigate = useNavigateWithHistory();
  const { id } = params;
  const { settings, conversations, messages, loading: convoLoading } = useSelector<RootState, CHT>(
    (state) => state.chat
  );
  const [chat, setChat] = useState<ChatDataClient | "i">("i");
  const [chatSettings, setChatSettings] = useState<NewChatSettings | undefined>(undefined);

  const convo = useMemo(
    () => conversations?.find((c) => c.id === id) as ConvoType | undefined,
    [conversations, id]
  );

  // Extract URLs from message content
  const extractUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  // Get preview data for media, docs, and links
  const previewData = useMemo(() => {
    const chatMessages = (messages?.filter((msg) => msg.chatId === id) as MessageAttributes[]) || [];

    const sortedMessages = [...chatMessages].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const mediaItems: Array<{ attachment: Attachment; message: MessageAttributes }> = [];
    sortedMessages.forEach((msg) => {
      msg.attachments?.forEach((att) => {
        const type = att.type?.split("/")[0];
        if ((type === "image" || type === "video") && mediaItems.length < 4) {
          mediaItems.push({ attachment: att, message: msg });
        }
      });
    });

    const docItems: Array<{ attachment: Attachment; message: MessageAttributes }> = [];
    sortedMessages.forEach((msg) => {
      msg.attachments?.forEach((att) => {
        const type = att.type?.split("/")[0];
        if (type !== "image" && type !== "video" && type !== "audio" && docItems.length < 3) {
          docItems.push({ attachment: att, message: msg });
        }
      });
    });

    const linkItems: Array<{ url: string; message: MessageAttributes }> = [];
    sortedMessages.forEach((msg) => {
      if (msg.content) {
        extractUrls(msg.content).forEach((url) => {
          if (linkItems.length < 3) {
            linkItems.push({ url, message: msg });
          }
        });
      }
    });

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
        linkCount += extractUrls(msg.content).length;
      }
    });

    return {
      media: mediaItems.slice(0, 4),
      docs: docItems.slice(0, 3),
      links: linkItems.slice(0, 3),
      counts: { media: mediaCount, docs: docCount, links: linkCount },
    };
  }, [messages, id]);

  useEffect(() => {
    const fetchChat = async () => {
      if (id) {
        const fetchedChat = await chatSystem.getChatById(id);
        setChat(fetchedChat as ChatDataClient);
        const chatSettings = fetchedChat?.participants
          ?.find((participant) => participant._id.toString() === id)
          ?.chatSettings;
        setChatSettings(chatSettings);
      }
    };

    if (!convoLoading) {
      const chatSettings = settings?.[id as string];
      if (chatSettings) {
        setChatSettings(chatSettings);
        setChat("i");
      } else {
        fetchChat();
      }
    }
  }, [id, convoLoading, settings]);

  const handleSettingsChange = async (field: keyof ChatSettings, value: any) => {
    if (chatSettings) {
      setChatSettings({ ...chatSettings, [field]: value });
      const result = await chatSystem.updateChatSettings(id || "", {
        ["chatSettings." + field]: value,
      });
      setChatSettings(result);
    }
  };

  const soundName = chatSettings?.notificationSound?.split(/[\\/]/).pop();

  if (!chat || !chatSettings) {
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
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Chat Settings</h1>
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate()}
            aria-label="Go back"
            className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800"
          >
            <FontAwesomeIcon icon={"arrow-left"} size="lg" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Chat Settings</h1>
        </div>
        <button
          type="button"
          aria-label="Chat options"
          onClick={() => router.push(`/chats/${params?.id}/settings`)}
          className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800"
        >
          <Trash2 className="size-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-xl space-y-6 p-4 pb-10">
          {convo && (
            <section className="rounded-xl bg-white p-6 text-center shadow-sm dark:bg-neutral-800">
              <div className="relative mx-auto mb-3 size-fit">
                <Avatar className="size-20 border-2 border-white shadow-md dark:border-neutral-900">
                  <AvatarFallback className="text-xl">
                    {convo?.name?.slice(0, 2).toUpperCase() || ""}
                  </AvatarFallback>
                  <AvatarImage
                    src={convo?.displayPicture}
                    className="size-20 rounded-full object-cover"
                    width={80}
                    height={80}
                    alt="Display Picture"
                  />
                </Avatar>
                {convo?.verified && (
                  <div className="absolute bottom-0 right-0">
                    <Statuser className="size-5" />
                  </div>
                )}
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{convo?.name}</h2>
              <p className="mt-0.5 flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                {convo?.online ? (
                  <>
                    <span className="size-2 rounded-full bg-green-500" />
                    Online
                  </>
                ) : (
                  "Direct message"
                )}
              </p>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between px-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Media, Links &amp; Docs
              </h2>
              <button
                type="button"
                onClick={() => router.push(`/chats/${id}/media`)}
                className="flex items-center gap-0.5 text-xs font-medium text-brand transition-colors hover:underline"
              >
                See all
                <ChevronRight size={14} />
              </button>
            </div>
            <SectionCard>
              {previewData.media.length > 0 && (
                <div className="space-y-2 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <Image size={14} className="text-brand" />
                    <span>Media ({previewData.counts.media})</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {previewData.media.map(({ attachment }, index) => {
                      const [type] = attachment.type?.split("/") || [];
                      const isImage = type === "image";
                      const isVideo = type === "video";

                      return (
                        <div
                          key={index}
                          className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-neutral-900"
                        >
                          {isImage && attachment.url ? (
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className="size-full object-cover"
                            />
                          ) : isVideo && attachment.url ? (
                            <>
                              <video src={attachment.url} className="size-full object-cover" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="rounded-full bg-black/50 p-1.5">
                                  <svg className="size-3 text-white" fill="currentColor" viewBox="0 0 20 20">
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

              {previewData.docs.length > 0 && (
                <div className="space-y-2 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <FileText size={14} className="text-brand" />
                    <span>Documents ({previewData.counts.docs})</span>
                  </div>
                  <div className="space-y-1">
                    {previewData.docs.slice(0, 2).map(({ attachment }, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 text-xs dark:bg-neutral-900"
                      >
                        <FileText size={16} className="shrink-0 text-brand" />
                        <span className="truncate text-gray-700 dark:text-gray-300">
                          {attachment.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewData.links.length > 0 && (
                <div className="space-y-2 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <LinkIcon size={14} className="text-blue-500" />
                    <span>Links ({previewData.counts.links})</span>
                  </div>
                  <div className="space-y-1">
                    {previewData.links.slice(0, 2).map(({ url }, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 text-xs dark:bg-neutral-900"
                      >
                        <LinkIcon size={16} className="shrink-0 text-blue-500" />
                        <span className="truncate text-gray-700 dark:text-gray-300">{url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewData.media.length === 0 &&
                previewData.docs.length === 0 &&
                previewData.links.length === 0 && (
                  <p className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No media, links, or documents yet
                  </p>
                )}
            </SectionCard>
          </section>

          <section>
            <SectionTitle>Notifications</SectionTitle>
            <SectionCard>
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="rounded-lg bg-gray-100 p-2 dark:bg-neutral-900">
                    <BellOff className="text-yellow-500" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white">Mute</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Silence alerts for this chat
                    </p>
                  </div>
                </div>
                <Switch
                  id="mute"
                  checked={chatSettings.isMuted}
                  onChange={(value: any) => handleSettingsChange("isMuted", value)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="rounded-lg bg-gray-100 p-2 dark:bg-neutral-900">
                    <BellRing className="text-purple-500" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Notification sound
                    </h3>
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                      {soundName || "Custom alert (2MB max)"}
                    </p>
                  </div>
                </div>
                <label
                  htmlFor="notification-sound"
                  className="shrink-0 cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-neutral-600 dark:text-gray-300 dark:hover:bg-neutral-700"
                >
                  {soundName ? "Change" : "Upload"}
                </label>
                <input
                  id="notification-sound"
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size <= 2 * 1024 * 1024) {
                      handleSettingsChange("notificationSound", e.target.value);
                    } else {
                      alert("File size must be 2MB or less");
                      e.target.value = "";
                    }
                  }}
                />
              </div>
              <div className="hidden items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="rounded-lg bg-gray-100 p-2 dark:bg-neutral-900">
                    <BellRing className="text-purple-500" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Notification volume
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Alert loudness</p>
                  </div>
                </div>
                <Slider
                  id="notification-volume"
                  min={0}
                  max={100}
                  value={chatSettings.notificationVolume || 50}
                  onChange={(value: any) => handleSettingsChange("notificationVolume", value)}
                />
              </div>
            </SectionCard>
          </section>

          <section>
            <SectionTitle>Conversation</SectionTitle>
            <SectionCard>
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="rounded-lg bg-gray-100 p-2 dark:bg-neutral-900">
                    <Pin className="text-blue-500" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white">Pin chat</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Keep this chat at the top
                    </p>
                  </div>
                </div>
                <Switch
                  id="pin"
                  checked={chatSettings.isPinned}
                  onChange={(value: any) => handleSettingsChange("isPinned", value)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="rounded-lg bg-gray-100 p-2 dark:bg-neutral-900">
                    <Archive className="text-green-500" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white">Archive chat</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Move this chat out of your inbox
                    </p>
                  </div>
                </div>
                <Switch
                  id="archive"
                  checked={chatSettings.isArchived}
                  onChange={(value: any) => handleSettingsChange("isArchived", value)}
                />
              </div>
            </SectionCard>
          </section>

          <section>
            <SectionTitle>Appearance</SectionTitle>
            <SectionCard>
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="rounded-lg bg-gray-100 p-2 dark:bg-neutral-900">
                    <Image className="text-pink-500" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white">Wallpaper</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Background image for this chat
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {chatSettings.wallpaper?.startsWith("data:image") && (
                    <div
                      className="size-10 rounded-lg border border-gray-200 bg-cover bg-center dark:border-neutral-600"
                      style={{ backgroundImage: `url(${chatSettings.wallpaper})` }}
                    />
                  )}
                  <label
                    htmlFor="wallpaper"
                    className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-neutral-600 dark:text-gray-300 dark:hover:bg-neutral-700"
                  >
                    {chatSettings.wallpaper ? "Change" : "Upload"}
                  </label>
                </div>
                <input
                  id="wallpaper"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size <= 5 * 1024 * 1024) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          handleSettingsChange("wallpaper", event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    } else {
                      alert("File size must be 5MB or less");
                      e.target.value = "";
                    }
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="rounded-lg bg-gray-100 p-2 dark:bg-neutral-900">
                    <Moon className="text-purple-500" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white">Theme</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Appearance for this chat
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 rounded-lg bg-gray-100 p-0.5 dark:bg-neutral-900">
                  {(["light", "dark"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSettingsChange("theme", option)}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                        chatSettings.theme === option
                          ? "bg-white text-gray-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      {option === "light" ? <Sun size={14} /> : <Moon size={14} />}
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </SectionCard>
          </section>
        </main>
      </div>
    </div>
  );
};

export default ChatSettingsPage;
