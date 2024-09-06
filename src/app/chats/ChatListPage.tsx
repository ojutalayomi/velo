'use client'
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useDispatch, useSelector } from 'react-redux';
import { showChat } from '@/redux/navigationSlice';
import { RootState } from '@/redux/store';
import { timeFormatter } from '@/templates/PostProps';
import { updateLiveTime } from '@/redux/chatSlice';

type FilteredChatsProps = {
    filteredChats: () => Array<{
      id: string;
      type: string;
      name: string;
      lastMessage: string;
      timestamp: string;
      unread: number;
      displayPicture: string;
      lastUpdated: string;
    }>;
};

interface Props {
  chat: {
    id: string;
    type: string;
    name: string;
    lastMessage: string;
    timestamp: string;
    unread: number;
    displayPicture: string;
    lastUpdated: string;
  }
}

interface NavigationState {
    chaT: string;
}


const Card: React.FC<Props> = ({chat}) => {
  const [time, setTime] = useState<string>();
  const { userdata, loading, error, refetchUser } = useUser();
  const router = useRouter();
  const dispatch = useDispatch();
  const url = 'https://s3.amazonaws.com/profile-display-images/';
  const { chaT } = useSelector<RootState, NavigationState>((state) => state.navigation);
  
  const openChat = (id: string) => {
    router.push(`/chats/${chat.id}`);
    dispatch(showChat(''));
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(updateLiveTime('getlivetime', chat.lastUpdated));
    }, 10000);
    return () => clearInterval(interval); // This is important to clear the interval when the component unmounts
  }, [chat.lastUpdated]);

  return(
    <div key={chat.id} className="bg-white dark:bg-zinc-900 p-3 cursor-pointer rounded-lg shadow-sm flex items-center space-x-3 overflow-hidden" onClick={() => openChat(chat.id)}>
      <Image src={
          chat.displayPicture  
          ?  (
            chat.displayPicture.includes('ila-') 
            ? '/default.jpeg'
            : url +  chat.displayPicture
          )
          : '/default.jpeg'} 
          height={40} width={40} alt={chat.name} className="w-12 h-12 rounded-full" />
      <div className="flex-grow">
        <div className="flex justify-between items-baseline">
          <h2 className="font-semibold">{chat.name}</h2>
          <span className="text-sm text-gray-500">{time}</span>
        </div>
        <p className="text-sm text-wrap text-gray-600 truncate">{chat.lastMessage ? chat.lastMessage.substring(0, 40) + (chat.lastMessage.length > 40 ? '...' : '') : 'No message available'}</p>
      </div>
      {chat.unread > 0 && (
        <div className="bg-brand text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {chat.unread}
        </div>
      )}
    </div>
  )
}

const ChatListPage: React.FC<FilteredChatsProps> = ({filteredChats}) => {
    return (
      <div className="flex-grow p-4 h-full overflow-auto">
        <div className="flex flex-col gap-1 mb-10 tablets1:mb-0">
          {filteredChats().map((chat,key) => (
            <Card key={key} chat={chat} />
          ))}
        </div>
      </div>
    );
};

export default ChatListPage;