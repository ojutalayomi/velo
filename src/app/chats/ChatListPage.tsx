'use client'
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useDispatch, useSelector } from 'react-redux';
import { showChat } from '@/redux/navigationSlice';
import { RootState } from '@/redux/store';
import { timeFormatter } from '@/templates/PostProps';
import { updateLiveTime, updateConversation } from '@/redux/chatSlice';
import { ConvoType, MessageAttributes, NewChatSettings } from '@/lib/types/type';

type FilteredChatsProps = {
    filteredChats: () => Array<ConvoType>;
    className?: string;
};

interface Props {
  chat: ConvoType
}

interface NavigationState {
    chaT: string;
}

interface ChatState {
  isTyping: {
    [key: string]: boolean;
  };
}

interface ChatSetting {
  [x: string]: NewChatSettings
}

interface CHT {
  messages: MessageAttributes[],
  settings: ChatSetting,
  conversations: ConvoType[],
  loading: boolean,
  isOnline: boolean,
}

const Card: React.FC<Props> = ({chat}) => {
  const [time, setTime] = useState<string>();
  // const { messages , settings, conversations, loading: convoLoading, isOnline } = useSelector<RootState, CHT>((state) => state.chat);
  // const convo = conversations?.find(c => c.id === chat.id);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(chat?.pinned);
  const [isDeleted, setIsDeleted] = useState(chat?.deleted);
  const [isArchived, setIsArchived] = useState(chat?.archived);
  const [isHidden, setIsHidden] = useState(false);
  const [isUnread, setIsUnread] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const { userdata, loading, error, refetchUser } = useUser();
  const router = useRouter();
  const dispatch = useDispatch();
  const url = 'https://s3.amazonaws.com/profile-display-images/';
  const { chaT } = useSelector<RootState, NavigationState>((state) => state.navigation);
  
  const openChat = (id: string) => {
    const path = chat.type === 'group' ? `/chats/group/${id}` : `/chats/${id}`;
    router.push(path);
    dispatch(showChat(''));
  }
  // console.log(onlineUsers)
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(updateLiveTime('getlivetime', chat.lastUpdated));
    }, 10000);

    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        setShowDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [chat.lastUpdated, showDropdown]);

  const options = [
    { id: 1, name: isPinned ? 'Unpin' : 'Pin', action: () => dispatch(updateConversation({ id: chat.id, updates: { pinned: !isPinned } })) },
    { id: 2, name: isDeleted ? 'Undeleted' : 'Delete', action: () => dispatch(updateConversation({ id: chat.id, updates: { deleted: !isDeleted } })) },
    { id: 3, name: isArchived ? 'Unarchive' : 'Archive', action: () => dispatch(updateConversation({ id: chat.id, updates: { archived: !isArchived } })) },
    { id: 4, name: isHidden ? 'Unhide' : 'Hide', action: () => setIsHidden(!isHidden) },
    { id: 5, name: isUnread ? 'Mark as read' : 'Mark as unread', action: () => setIsUnread(!isUnread) },
    { id: 6, name: isBlocked ? 'Unblock' : 'Block', action: () => setIsBlocked(!isBlocked) },
  ];

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return(

    <div key={chat.id} 
      className="bg-white dark:bg-zinc-900 dark:text-white hover:bg-slate-200 hover:dark:bg-zinc-700 p-3 cursor-pointer rounded-lg shadow-sm flex items-center space-x-3 overflow-visible transition-colors duration-150 tablets1:duration-300 relative" 
      onClick={() => openChat(chat.id)} 
      onContextMenu={(event) => {
        event.preventDefault();
        setShowDropdown(chat.id);
      }}
      onTouchStart={(event) => {
        if (event.touches.length === 1) {
          const touch = event.touches[0];
          const longPressTimer = setTimeout(() => {
            setShowDropdown(chat.id);
          }, 500); // 500ms long press
          
          const cancelLongPress = () => {
            clearTimeout(longPressTimer);
          };

          document.addEventListener('touchend', cancelLongPress);
          document.addEventListener('touchmove', cancelLongPress);

          return () => {
            document.removeEventListener('touchend', cancelLongPress);
            document.removeEventListener('touchmove', cancelLongPress);
          };
        }
      }}
    >
      {showDropdown === chat.id && (
        <div className="dropdown-menu absolute top-0 right-2 mt-2 bg-white dark:bg-zinc-800 rounded-md shadow-lg z-10" onClick={(e) => e.stopPropagation()}>
          <ul className="py-1">
            {options.map((option) => (
              <li key={option.id} 
                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  option.action();
                }}
              >
                {option.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="relative">
        <Image src={
            chat.displayPicture  
            ?  (
              chat.displayPicture.includes('ila-') 
              ? '/default.jpeg'
              : url +  chat.displayPicture
            )
            : '/default.jpeg'} 
            height={40} width={40} alt={chat.name} className="w-12 h-12 rounded-full" />
        {chat.isTyping && chat.participants.find(id => id !== userdata._id) && chat.isTyping[chat.participants.find(id => id !== userdata._id) as string] && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        )}
      </div>
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

const ChatListPage: React.FC<FilteredChatsProps> = ({filteredChats,className = 'overflow-auto p-4'}) => {
    return (
      <div className={`flex-grow h-full ${className}`}>
        <div className="flex flex-col gap-1 mb-10 tablets1:mb-0">
          {filteredChats().map((chat,key) => (
            <Card key={key} chat={chat} />
          ))}
        </div>
      </div>
    );
};

export default ChatListPage;