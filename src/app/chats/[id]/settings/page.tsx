'use client'
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Switch, Slider } from '@/components/ui';
import ChatSystem  from '@/lib/class/chatSystem';
import { ChatSettings } from '@/lib/types/type';
import ChatRepository from '@/lib/class/ChatRepository';
import Chat from '@/lib/class/chatAttr';

interface ChatSettingsPageProps {
  chatSystem: ChatSystem;
}
interface Params {
    id?: string;
}

const chatRepository = new ChatRepository();

const chatSystem = new ChatSystem(chatRepository);

const ChatSettingsPage: React.FC = ({ }) => {
    const params = useParams() as Params;
    const { id } = params;
    const [chat, setChat] = useState<Chat | undefined>(undefined);
    const [chatSettings, setChatSettings] = useState<ChatSettings | undefined>(undefined);

    useEffect(() => {
        const fetchChat = async () => {
          if (id) {
            const fetchedChat = await chatSystem.getChatById(parseInt(id));
            setChat(fetchedChat);
            setChatSettings(fetchedChat?.chatSettings);
          }
        };
    
        fetchChat();
      }, [id]);

  const handleSettingsChange = (
    field: keyof ChatSettings,
    value: any
  ) => {
    if (chatSettings) {
      setChatSettings({ ...chatSettings, [field]: value });
      chatSystem.updateChatSettings(parseInt(id || ''), { [field]: value });
    }
  };

  if (!chat || !chatSettings) {
    return (
      <div className='flex flex-col items-center h-full w-full'>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow w-full">
      <h2 className="text-2xl font-bold mb-4">Chat Settings</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="mute" className="text-gray-700">
            Mute
          </label>
          <Switch
            id="mute"
            checked={chatSettings.isMuted}
            onChange={(value: any) => handleSettingsChange('isMuted', value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="pin" className="text-gray-700">
            Pin
          </label>
          <Switch
            id="pin"
            checked={chatSettings.isPinned}
            onChange={(value: any) => handleSettingsChange('isPinned', value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="archive" className="text-gray-700">
            Archive
          </label>
          <Switch
            id="archive"
            checked={chatSettings.isArchived}
            onChange={(value: any) => handleSettingsChange('isArchived', value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="notification-sound" className="text-gray-700">
            Notification Sound
          </label>
          <input
            id="notification-sound"
            type="text"
            value={chatSettings.notificationSound || ''}
            onChange={(e) =>
              handleSettingsChange('notificationSound', e.target.value)
            }
            className="border rounded-md px-2 py-1"
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="notification-volume" className="text-gray-700">
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
          <label htmlFor="theme" className="text-gray-700">
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