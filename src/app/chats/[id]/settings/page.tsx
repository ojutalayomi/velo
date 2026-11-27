"use client";
import { Archive, BellOff, BellRing, Image as ImageIcon, Loader2, Moon, Pin, Sun } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import WallpaperPicker from "@/components/chat/WallpaperPicker";
import { saveChatSettings } from "@/lib/chatSettingsApi";
import { parseWallpaper, wallpaperStyle } from "@/lib/chatWallpaper";
import { toast } from "@/lib/toast";
import { patchChatSettings } from "@/redux/chatSlice";

import {
  RowButton,
  SettingsRow,
  SettingsSection,
  SettingsShell,
  SharedMediaSection,
  useSharedMedia,
} from "@/components/chat-settings/primitives";
import { Switch } from "@/components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Statuser } from "@/components/VerificationComponent";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import ChatRepository from "@/lib/class/ChatRepository";
import ChatSystem from "@/lib/class/chatSystem";
import { ChatDataClient, ChatSettings, MessageAttributes, NewChatSettings } from "@/lib/types/type";
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

const ChatSettingsPage: React.FC = () => {
  const params = useParams() as Params;
  const navigate = useNavigateWithHistory();
  const { id } = params;
  const { settings, conversations, messages, loading: convoLoading } = useSelector<RootState, CHT>(
    (state) => state.chat
  );
  const [chat, setChat] = useState<ChatDataClient | "i">("i");
  const [chatSettings, setChatSettings] = useState<NewChatSettings | undefined>(undefined);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const dispatch = useDispatch();

  const convo = useMemo(
    () => conversations?.find((c) => c.id === id) as ConvoType | undefined,
    [conversations, id]
  );

  const sharedMedia = useSharedMedia(messages, id);

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
    if (chatSettings && field === "isMuted") {
      setChatSettings({ ...chatSettings, isMuted: value });
      const error = await saveChatSettings({
        dispatch,
        patch: patchChatSettings,
        chatId: id || "",
        previous: { isMuted: chatSettings.isMuted },
        updates: { isMuted: value },
      });
      if (error) {
        setChatSettings(chatSettings);
        toast.error(error);
      }
      return;
    }
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
      <SettingsShell title="Chat settings" onBack={() => navigate()}>
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-gray-400" />
        </div>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell title="Chat settings" onBack={() => navigate()}>
      <WallpaperPicker chatId={id || ""} open={wallpaperOpen} onOpenChange={setWallpaperOpen} />
      {convo && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-xs dark:border-neutral-800 dark:bg-neutral-800">
          <div className="relative mx-auto mb-3 size-fit">
            <Avatar className="size-24 border-2 border-white shadow-md dark:border-neutral-900">
              <AvatarFallback className="text-xl">
                {convo.name?.slice(0, 2).toUpperCase() || ""}
              </AvatarFallback>
              <AvatarImage
                src={convo.displayPicture}
                className="size-24 rounded-full object-cover"
                width={96}
                height={96}
                alt="Display Picture"
              />
            </Avatar>
            {convo.verified && (
              <div className="absolute bottom-0 right-0">
                <Statuser className="size-5" />
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{convo.name}</h2>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            {convo.online ? (
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

      <SettingsSection title="Notifications">
        <SettingsRow icon={BellOff} tone="amber" title="Mute" description="Silence alerts for this chat">
          <Switch
            id="mute"
            checked={chatSettings.isMuted}
            onChange={(value: any) => handleSettingsChange("isMuted", value)}
          />
        </SettingsRow>
        <SettingsRow
          icon={BellRing}
          tone="purple"
          title="Notification sound"
          description={soundName || "Custom alert (2MB max)"}
        >
          <label htmlFor="notification-sound" className="shrink-0 cursor-pointer">
            <RowButton tabIndex={-1} className="pointer-events-none">
              {soundName ? "Change" : "Upload"}
            </RowButton>
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
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Conversation">
        <SettingsRow icon={Pin} tone="blue" title="Pin chat" description="Keep this chat at the top">
          <Switch
            id="pin"
            checked={chatSettings.isPinned}
            onChange={(value: any) => handleSettingsChange("isPinned", value)}
          />
        </SettingsRow>
        <SettingsRow
          icon={Archive}
          tone="green"
          title="Archive chat"
          description="Move this chat out of your inbox"
        >
          <Switch
            id="archive"
            checked={chatSettings.isArchived}
            onChange={(value: any) => handleSettingsChange("isArchived", value)}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Appearance">
        <SettingsRow
          icon={ImageIcon}
          tone="pink"
          title="Wallpaper"
          description="Background image for this chat"
        >
          <div className="flex shrink-0 items-center gap-3">
            {parseWallpaper(chatSettings.wallpaper).kind !== "none" && (
              <div
                className="size-10 rounded-lg border border-gray-200 dark:border-neutral-600"
                style={wallpaperStyle(chatSettings.wallpaper)}
              />
            )}
            <RowButton onClick={() => setWallpaperOpen(true)}>
              {chatSettings.wallpaper ? "Change" : "Choose"}
            </RowButton>
          </div>
        </SettingsRow>
        <SettingsRow icon={Moon} tone="purple" title="Theme" description="Appearance for this chat">
          <div className="flex shrink-0 rounded-lg bg-gray-100 p-0.5 dark:bg-neutral-900">
            {(["light", "dark"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSettingsChange("theme", option)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  chatSettings.theme === option
                    ? "bg-white text-gray-900 shadow-xs dark:bg-neutral-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {option === "light" ? <Sun size={14} /> : <Moon size={14} />}
                {option}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsSection>

      <SharedMediaSection href={`/chats/${id}/media`} data={sharedMedia} />
    </SettingsShell>
  );
};

export default ChatSettingsPage;
