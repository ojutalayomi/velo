/* eslint-disable tailwindcss/no-custom-classname */
"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { Switch, Slider } from "@/components/ui";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import ChatRepository from "@/lib/class/ChatRepository";
import ChatSystem from "@/lib/class/ChatSystem";
import { ChatDataClient, ChatSettings, MessageAttributes, NewChatSettings } from "@/lib/types/type";
import { ConvoType } from "@/redux/chatSlice";
import { RootState } from "@/redux/store";

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
    settings,
    loading: convoLoading,
  } = useSelector<RootState, CHT>((state) => state.chat);
  const [chat, setChat] = useState<ChatDataClient | "i">("i");
  const [chatSettings, setChatSettings] = useState<NewChatSettings | undefined>(undefined);

  useEffect(() => {
    const fetchChat = async () => {
      if (gid) {
        const fetchedChat = await chatSystem.getChatById(gid);
        setChat(fetchedChat as ChatDataClient);
        const chatSettings = fetchedChat?.participants.find(
          (participant) => participant._id.toString() === gid
        )?.chatSettings;
        setChatSettings(chatSettings);
      }
    };

    if (!convoLoading) {
      const chatSettings = settings?.[gid as string];
      if (chatSettings) {
        setChatSettings(chatSettings);
        setChat("i");
      } else {
        fetchChat();
      }
    }
  }, [gid, convoLoading, settings]);

  const handleSettingsChange = async (field: keyof ChatSettings, value: any) => {
    if (chatSettings) {
      setChatSettings({ ...chatSettings, [field]: value });
      const result = await chatSystem.updateChatSettings(gid || "", {
        ["chatSettings." + field]: value,
      });
      setChatSettings(result);
    }
  };

  if (!chat || !chatSettings) {
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
      className={`absolute z-10 flex size-full max-h-screen min-h-screen flex-1 flex-col overflow-hidden rounded-lg bg-white shadow-md tablets1:z-[unset] tablets1:w-1/2 tablets1:bg-white dark:bg-black`}
    >
      <div className="flex items-center justify-between gap-4 border-b bg-gray-100 p-2 dark:bg-zinc-900 dark:text-slate-200">
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
        <div className="flex items-center justify-between">
          <label htmlFor="mute" className="text-gray-700 dark:text-slate-200">
            Mute
          </label>
          <Switch
            id="mute"
            checked={chatSettings.isMuted}
            onChange={(value: any) => handleSettingsChange("isMuted", value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="pin" className="text-gray-700 dark:text-slate-200">
            Pin
          </label>
          <Switch
            id="pin"
            checked={chatSettings.isPinned}
            onChange={(value: any) => handleSettingsChange("isPinned", value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="archive" className="text-gray-700 dark:text-slate-200">
            Archive
          </label>
          <Switch
            id="archive"
            checked={chatSettings.isArchived}
            onChange={(value: any) => handleSettingsChange("isArchived", value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="notification-sound" className="text-gray-700 dark:text-slate-200">
            Notification Sound
          </label>
          <input
            id="notification-sound"
            type="file"
            accept="audio/*"
            list="audio-files"
            value={chatSettings.notificationSound || ""}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.size <= 2 * 1024 * 1024) {
                handleSettingsChange("notificationSound", e.target.value);
              } else {
                alert("File size must be 2MB or less");
                e.target.value = "";
              }
            }}
            className="rounded-md border px-2 py-1"
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="wallpaper" className="text-gray-700 dark:text-slate-200">
            Wallpaper
          </label>
          <input
            id="wallpaper"
            type="file"
            accept="image/*"
            list="image-files"
            value={chatSettings.wallpaper || ""}
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
            className="rounded-md border px-2 py-1"
          />
        </div>
        <div className="hidden items-center justify-between">
          <label htmlFor="notification-volume" className="text-gray-700 dark:text-slate-200">
            Notification Volume
          </label>
          <Slider
            id="notification-volume"
            min={0}
            max={100}
            value={chatSettings.notificationVolume || 50}
            onChange={(value: any) => handleSettingsChange("notificationVolume", value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="theme" className="text-gray-700 dark:text-slate-200">
            Theme
          </label>
          <select
            id="theme"
            value={chatSettings.theme}
            onChange={(e) => handleSettingsChange("theme", e.target.value as "light" | "dark")}
            className="rounded-md border px-2 py-1"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ChatSettingsPage;
