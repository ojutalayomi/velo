'use client'
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useDispatch, useSelector } from 'react-redux';
import { showChat } from '@/redux/navigationSlice';
import { RootState } from '@/redux/store';
import { updateLiveTime, updateConversation } from '@/redux/chatSlice';
import { ConvoType, MessageAttributes, NewChatSettings } from '@/lib/types/type';
import { Pin } from 'lucide-react';
import { useSocket } from '../providers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Statuser } from '@/components/VerificationComponent';

type FilteredChatsProps = {
    filteredChats: () => Array<ConvoType>;
    className?: string;
    className1?: string;
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
  const { onlineUsers } = useSelector((state: RootState) => state.utils);
  const socket = useSocket();
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(chat?.pinned);
  const [isDeleted, setIsDeleted] = useState(chat?.deleted);
  const [isArchived, setIsArchived] = useState(chat?.archived);
  const [isHidden, setIsHidden] = useState(false);
  const [isUnread, setIsUnread] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const { userdata } = useUser();
  const router = useRouter();
  const dispatch = useDispatch();
  const url = 'https://s3.amazonaws.com/profile-display-images/';
  const chaT = useSelector<RootState>((state) => state.chat);
  const [showFullscreen, setShowFullscreen] = useState(false);
  
  const openChat = (id: string) => {
    const path = chat.type === 'Groups' ? `/chats/group/${id}` : `/chats/${id}`;
    router.push(path);
    dispatch(showChat(''));
  }
  // console.log(onlineUsers)
  useEffect(() => {
    const updateTimer = () => {
      const timeDifference = Date.now() - Date.parse(chat.lastUpdated);
      if (timeDifference > (86400 * 1000)) {
        const today = new Date();
        const lastUpdatedDate = new Date(chat.lastUpdated);
        if (today.toISOString().split('T')[0] !== lastUpdatedDate.toISOString().split('T')[0]) {
          if (today.getDate() - lastUpdatedDate.getDate() === 1) {
            setTime('Yesterday.');
          } else {
            const date = lastUpdatedDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
            setTime(date);
          }
        }
      } else {
        setTime(updateLiveTime('chat-time', chat.lastUpdated));
      }
    };

    updateTimer();
  }, [chat.lastUpdated]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        setShowDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDropdown]);

  const options = [
    { id: 1, name: isPinned ? 'Unpin' : 'Pin', action: () => dispatch(updateConversation({ id: chat.id, updates: { pinned: !isPinned } })) },
    { id: 2, name: isDeleted ? 'Undelete' : 'Delete', action: () => dispatch(updateConversation({ id: chat.id, updates: { deleted: !isDeleted } })) },
    { id: 3, name: isArchived ? 'Unarchive' : 'Archive', action: () => dispatch(updateConversation({ id: chat.id, updates: { archived: !isArchived } })) },
    { id: 4, name: isHidden ? 'Unhide' : 'Hide', action: () => setIsHidden(!isHidden) },
    { id: 5, name: isUnread ? 'Mark as read' : 'Mark as unread', action: () => setIsUnread(!isUnread) },
    { id: 6, name: isBlocked ? 'Unblock' : 'Block', action: () => setIsBlocked(!isBlocked) },
  ];

  const fullscreen = () => {
    setShowFullscreen(true);
  }

  const filteredKeys = Object.keys(chat?.isTyping).filter(i => i !== userdata._id).map(f => {
    return chat?.isTyping[f]
  })

  return(

    <div key={chat.id} 
      className="bg-white dark:bg-zinc-900 dark:text-white hover:bg-slate-200 hover:dark:bg-zinc-700 p-3 cursor-pointer rounded-lg shadow-bar dark:shadow-bar-dark flex items-center space-x-3 overflow-visible transition-colors duration-150 tablets1:duration-300 relative" 
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
                  if(socket){
                    option.action();
                    switch (true) {
                      case option.name.toLowerCase().includes("pin"):
                        socket.emit('updateConversation', { 
                          id: chat.id, 
                          updates: { pinned: !isPinned, userId: userdata._id } 
                        });
                        break;
                      case option.name.toLowerCase().includes("archive"):
                        socket.emit('updateConversation', { 
                          id: chat.id, 
                          updates: { archived: !isArchived, userId: userdata._id } 
                        });
                        break;
                      case option.name.toLowerCase().includes("delete"):
                        socket.emit('updateConversation', { 
                          id: chat.id, 
                          updates: { deleted: !isDeleted, convo: true } 
                        });
                        break;
                      case option.name.toLowerCase().includes("read"):
                        const unread = isUnread ? 1 : 0;
                        socket.emit('updateConversation', { 
                          id: chat.id, 
                          updates: { unreadCount: unread, userId: userdata._id } 
                        });
                        break;
                      default:
                        break;
                    }
                  }
                }}
              >
                {option.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="relative">
        <Avatar>
          <AvatarFallback>{chat.name.slice(0,2)}</AvatarFallback>
          <AvatarImage
          src={
            chat.displayPicture  
            ?  (
              chat.displayPicture.includes('ila-') 
              ? ''
              : url +  chat.displayPicture
            )
            : ''
          }
          onClick={(e) => {
            e.preventDefault();
            fullscreen();
          }}
          height={40} width={40} alt={chat.name} 
          className="w-10 h-10 min-w-10 rounded-full" 
          />
        </Avatar>
        {(chat.type === 'DMs' && onlineUsers.includes(chat.participants.find(id => id !== userdata._id) as string)) && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"/>}
      </div>
      <div className="flex-grow w-1/4">
        <div className="flex justify-between items-baseline">
          <div className='flex items-center gap-1'>
            <h2 className="font-semibold truncate">{chat.name}</h2>
            {chat.verified && 
              <Statuser className="size-4 flex-shrink-0"/>
            }
          </div>
        </div>
        <p className="text-sm text-gray-600 truncate">
          {(chat.isTyping[chat.participants.find(id => id !== userdata._id) as string] || filteredKeys.includes(true)) 
            ? 'Typing...' 
            : (chat.lastMessage 
                ? chat.lastMessage
                : 'No message available')}
        </p>
      </div>
      <div className='flex flex-col items-end gap-1'>
        <span className="text-sm text-gray-500 text-nowrap">{time}</span>
        <div className="flex items-center gap-2">
          {chat.unread > 0 && (
            <div className="bg-brand text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {chat.unread}
            </div>
          )}
          {chat.pinned && (
            <Pin size={21} 
            className={`text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out`}
            onClick={(event) => {
              event.stopPropagation();
              if (socket) {
                socket.emit('updateConversation',{ id: chat.id, updates: { pinned: !isPinned, userId: userdata._id } });
                dispatch(updateConversation({ id: chat.id, updates: { pinned: !chat.pinned } }));
              }
            }}
            />
          )}
        </div>
      </div>
      {showFullscreen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <Image 
            src={
              chat.displayPicture  
              ? (chat.displayPicture.includes('ila-') 
                ? '/default.jpeg'
                : url + chat.displayPicture)
              : '/default.jpeg'
            }
            height={500} 
            width={500} 
            alt={chat.name}
            className="max-h-[90vh] w-auto object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  )
}

const ChatListPage: React.FC<FilteredChatsProps> = ({filteredChats,className = 'overflow-auto p-4 pt-2',className1 = 'mb-10'}) => {
  return (
    <div className={`flex-grow h-full ${className}`}>
      <div className={`flex flex-col gap-2 ${className1} tablets1:mb-0`}>
        {filteredChats().sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()) // Sort by lastUpdated
          .map((chat, index) => (
            <Card key={index} chat={chat} />
          ))}
      </div>
    </div>
  );
};

export default ChatListPage;