'use client'
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useDispatch, useSelector } from 'react-redux';
import { showChat } from '@/redux/navigationSlice';
import { RootState } from '@/redux/store';
import { timeFormatter } from '@/templates/PostProps';

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
  chat: {
    id: number;
    type: string;
    name: string;
    lastMessage: string;
    timestamp: string;
    unread: number;
  }
}

interface NavigationState {
    chaT: string;
}

export function updateLiveTime(response: "countdown" | "getlivetime", Time: string): string {

    const time = new Date(Time).getTime();
    const now = new Date().getTime();
    let distance: number;
  
    if(response === "countdown"){
      // Find the distance between now an the count down date
      distance = time - now;
    } else if(response === "getlivetime"){
      // Find the distance between now an the count up date
      distance = now - time;
    } else {
      throw new Error("Invalid response type. Expected 'countdown' or 'getlivetime'.");
    }
    
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
  
    let liveTime: string;
    
    if (days > 0) {
    const [date/*,time*/] = Time.split(',');
      liveTime = date;
    } else if (hours > 0) {
      liveTime = hours + (hours === 1 ? " hr" : " hrs");
    } else if (minutes > 0) {
      liveTime = minutes + (minutes === 1 ? " min" : " mins");
    } else {
      liveTime = seconds + (seconds === 1 ? " sec" : " secs");
    }
    return liveTime;
}

const Card: React.FC<Props> = ({chat}) => {
  const [time, setTime] = useState<string>();
  const { userdata, loading, error, refetchUser } = useUser();
  const router = useRouter();
  const dispatch = useDispatch();
  const { chaT } = useSelector<RootState, NavigationState>((state) => state.navigation);
  
  const openChat = (id: number) => {
    router.push(`/chats/${userdata.chatid+'+'+id}`);
    dispatch(showChat(''));
  }

  useEffect(() => {
      const interval = setInterval(() => {
          setTime(updateLiveTime('getlivetime', chat.timestamp));
      }, 1000);
      return () => clearInterval(interval); // This is important to clear the interval when the component unmounts
  }, [chat.timestamp]);

  return(
    <div key={chat.id} className="bg-white dark:bg-zinc-900 p-3 cursor-pointer rounded-lg shadow-sm flex items-center space-x-3 overflow-hidden" onClick={() => openChat(chat.id)}>
      <Image src={`/300x300.png?${40 + chat.id}`} height={40} width={40} alt={chat.name} className="w-12 h-12 rounded-full" />
      <div className="flex-grow">
        <div className="flex justify-between items-baseline">
          <h2 className="font-semibold">{chat.name}</h2>
          <span className="text-sm text-gray-500">{time}</span>
        </div>
        <p className="text-sm text-wrap text-gray-600 truncate">{chat.lastMessage}</p>
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