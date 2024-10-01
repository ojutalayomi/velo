'use client'
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Switch, Slider } from '@/components/ui';
import ChatSystem  from '@/lib/class/chatSystem';
import { ChatData, ChatSettings, GroupMessageAttributes, MessageAttributes, NewChatSettings } from '@/lib/types/type';
import ChatRepository from '@/lib/class/ChatRepository';
import Chat from '@/lib/class/chatAttr';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Copy, Ellipsis, Loader2, Reply, Send, Settings, TextQuote, Trash2, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { ConvoType, defaultSettings } from '@/redux/chatSlice';

interface ChatSettingsPageProps {
  chatSystem: ChatSystem;
}
interface Params {
    id?: string;
}

interface ChatSetting {
  [x: string]: NewChatSettings
}

interface CHT {
  messages: (MessageAttributes | GroupMessageAttributes)[],
  settings: ChatSetting,
  conversations: ConvoType[],
  loading: boolean,
}

const chatRepository = new ChatRepository();

const chatSystem = new ChatSystem(chatRepository);

const ChatSettingsPage: React.FC = ({ }) => {
  const router = useRouter();
  const params = useParams() as Params;
  const { id } = params;
  const { messages , settings, conversations, loading: convoLoading } = useSelector<RootState, CHT>((state) => state.chat);
  const [chat, setChat] = useState<ChatData | 'i'>('i');
  const [chatSettings, setChatSettings] = useState<NewChatSettings | undefined>(undefined);

  useEffect(() => {
      const fetchChat = async () => {
        if (id) {
          const fetchedChat = await chatSystem.getChatById(id);
          setChat(fetchedChat as ChatData);
          const chatSettings = fetchedChat?.participants.find((participant) => participant.id === id)?.chatSettings;
          setChatSettings(chatSettings);
        }
      };
  
      if(!convoLoading) {
        const chatSettings = settings?.[id as string];
        if(chatSettings) {
          setChatSettings(chatSettings);
          setChat('i');
        } else {
          fetchChat();
        }
      }
    }, [id, convoLoading, settings]);

  const handleSettingsChange = async (
    field: keyof ChatSettings,
    value: any
  ) => {
    if (chatSettings) {
      setChatSettings({ ...chatSettings, [field]: value });
      const result = await chatSystem.updateChatSettings(id || '', { ['chatSettings.'+field]: value });
      setChatSettings(result);
    }
  };

  if (!chat || !chatSettings) {
    return (
      <div className={`absolute bg-white dark:bg-black dark:text-slate-200 flex flex-col items-center justify-center h-full w-full z-10 tablets1:w-1/2 tablets1:z-[unset]`}>
        <div className="absolute top-0 w-full bg-gray-100 dark:bg-zinc-900 dark:text-slate-200 flex gap-4 items-center justify-between p-2 border-b">
          <div className='flex gap-4 items-center justify-start'>
            <FontAwesomeIcon onClick={() => router.back()} icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
            <h2 className="font-bold">Chat Settings</h2>
          </div>
          <Trash2 
          className='text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]'
          onClick={() => router.push(`/chats/${params?.id}/settings`)}
          />
        </div>
        <Loader2 className='text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px] animate-spin' size={21} />
      </div>
    );
  }

  return (
    <div className={`bg-white tablets1:bg-white tablets1:w-1/2 dark:bg-black shadow-md flex flex-col min-h-screen max-h-screen flex-1 rounded-lg overflow-hidden absolute h-full w-full z-10 tablets1:z-[unset]`}>
      <div className="bg-gray-100 dark:bg-zinc-900 dark:text-slate-200 flex gap-4 items-center justify-between p-2 border-b">
        <div className='flex gap-4 items-center justify-start'>
          <FontAwesomeIcon onClick={() => router.back()} icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
          <h2 className="font-bold">Chat Settings</h2>
        </div>
        <Trash2 
        className='text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]'
        onClick={() => router.push(`/chats/${params?.id}/settings`)}
        />
      </div>
      <div className="space-y-4 m-2">
        <div className="flex items-center justify-between">
          <label htmlFor="mute" className="dark:text-slate-200 text-gray-700">
            Mute
          </label>
          <Switch
            id="mute"
            checked={chatSettings.isMuted}
            onChange={(value: any) => handleSettingsChange('isMuted', value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="pin" className="dark:text-slate-200 text-gray-700">
            Pin
          </label>
          <Switch
            id="pin"
            checked={chatSettings.isPinned}
            onChange={(value: any) => handleSettingsChange('isPinned', value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="archive" className="dark:text-slate-200 text-gray-700">
            Archive
          </label>
          <Switch
            id="archive"
            checked={chatSettings.isArchived}
            onChange={(value: any) => handleSettingsChange('isArchived', value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="notification-sound" className="dark:text-slate-200 text-gray-700">
            Notification Sound
          </label>
          <input
            id="notification-sound"
            type="file"
            accept='audio/*'
            list='audio-files'
            value={chatSettings.notificationSound || ''}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.size <= 2 * 1024 * 1024) {
                handleSettingsChange('notificationSound', e.target.value);
              } else {
                alert('File size must be 2MB or less');
                e.target.value = '';
              }
            }}
            className="border rounded-md px-2 py-1"
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="wallpaper" className="dark:text-slate-200 text-gray-700">
            Wallpaper
          </label>
          <input
            id="wallpaper"
            type="file"
            accept="image/*"
            list='image-files'
            value={chatSettings.wallpaper || ''}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.size <= 5 * 1024 * 1024) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  if (event.target?.result) {
                    handleSettingsChange('wallpaper', event.target.result as string);
                  }
                };
                reader.readAsDataURL(file);
              } else {
                alert('File size must be 5MB or less');
                e.target.value = '';
              }
            }}
            className="border rounded-md px-2 py-1"
          />
        </div>
        <div className="items-center justify-between hidden">
          <label htmlFor="notification-volume" className="dark:text-slate-200 text-gray-700">
            Notification Volume
          </label>
          <Slider
            id="notification-volume"
            min={0}
            max={100}
            value={chatSettings.notificationVolume || 50}
            onChange={(value: any) =>
              handleSettingsChange('notificationVolume', value)
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="theme" className="dark:text-slate-200 text-gray-700">
            Theme
          </label>
          <select
            id="theme"
            value={chatSettings.theme}
            onChange={(e) =>
              handleSettingsChange('theme', e.target.value as 'light' | 'dark')
            }
            className="border rounded-md px-2 py-1"
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