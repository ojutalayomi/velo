'use client'
import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useDispatch, useSelector } from 'react-redux';
import { showChat } from '@/redux/navigationSlice';
import { RootState } from '@/redux/store';

type FilteredChatsProps = {
    filteredChats: () => Array<{
      id: number;
      type: string;
      name: string;
      lastMessage: string;
      timestamp: string;
      unread: number;
    }>;
};

interface Props {
    filteredChats: FilteredChatsProps
}

interface NavigationState {
    chaT: string;
}
const ChatListPage: React.FC<FilteredChatsProps> = ({filteredChats}) => {
    const { userdata, loading, error, refetchUser } = useUser();
    const router = useRouter();
    const dispatch = useDispatch();
    const { chaT } = useSelector<RootState, NavigationState>((state) => state.navigation);
    const openChat = (id: number) => {
      router.push(`/chats/${userdata.chatid+'+'+id}`);
      dispatch(showChat(''));
    }
    return (
      <div className="flex-grow p-4 h-full overflow-auto">
        <div className="flex flex-col gap-1 mb-10 tablets1:mb-0">
          {filteredChats().map(chat => (
            <div key={chat.id} className="bg-white dark:bg-zinc-900 p-3 cursor-pointer rounded-lg shadow-sm flex items-center space-x-3 overflow-hidden" onClick={() => openChat(chat.id)}>
              <Image src={`/300x300.png?${40 + chat.id}`} height={40} width={40} alt={chat.name} className="w-12 h-12 rounded-full" />
              <div className="flex-grow">
                <div className="flex justify-between items-baseline">
                  <h2 className="font-semibold">{chat.name}</h2>
                  <span className="text-sm text-gray-500">{chat.timestamp}</span>
                </div>
                <p className="text-sm text-wrap text-gray-600 truncate">{chat.lastMessage}</p>
              </div>
              {chat.unread > 0 && (
                <div className="bg-brand text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {chat.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
};

export default ChatListPage;