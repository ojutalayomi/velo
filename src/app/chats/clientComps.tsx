'use client'
import React, { useRef, useState } from 'react';
import Image from 'next/image';
import SwiperCore from 'swiper';
import { Swiper, SwiperSlide, useSwiper } from 'swiper/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '@/app/fontAwesomeLibrary';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { Pagination, Navigation } from 'swiper/modules';
import { MessageSquare, Users, Hash, Search, Phone, LockKeyholeOpen, LockKeyhole } from 'lucide-react';
import ChatSystem from '@/lib/class/chatSystem';
import ChatRepository from '@/lib/class/ChatRepository';
import ChatListPage from './ChatListPage';
import NewChatMenu from './NewChatMenu';
import { createContext } from 'react';

const chatRepository = new ChatRepository();

const chatSystem = new ChatSystem(chatRepository); 

type ChatType = "Chats" | "Groups" | "Channels";
type ChatSettingsTheme = "light" | "dark";

export default function App({ children }: Readonly<{ children: React.ReactNode;}>) {
  const { userdata, loading, error, refetchUser } = useUser();
  const router = useRouter();
  const [ayo,setAyo] = useState<boolean>();
  const [swiper, updateSwiper] = useState<SwiperCore | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [createPage, openCreatePage] = useState(false);

  const conversations = [
    // Direct Chats
    { id: 1, type: 'chat', name: 'John Doe', lastMessage: 'Hey, how are you?', timestamp: '2m ago', unread: 2 },
    { id: 2, type: 'chat', name: 'Jane Smith', lastMessage: 'See you tomorrow!', timestamp: '1h ago', unread: 0 },
    { id: 3, type: 'chat', name: 'Bob Johnson', lastMessage: 'Can you send me that file?', timestamp: '3h ago', unread: 1 },
    { id: 4, type: 'chat', name: 'Alice Brown', lastMessage: 'Thanks for your help!', timestamp: 'Yesterday', unread: 0 },
    { id: 5, type: 'chat', name: 'Charlie Wilson', lastMessage: "Let's meet at 3 PM", timestamp: '2d ago', unread: 0 },
    
    // Channels
    { id: 6, type: 'channel', name: 'announcements', lastMessage: 'New product launch next week!', timestamp: '30m ago', unread: 5 },
    { id: 7, type: 'channel', name: 'general', lastMessage: "Who's up for lunch?", timestamp: '1h ago', unread: 2 },
    { id: 8, type: 'channel', name: 'tech-support', lastMessage: 'Server maintenance scheduled for tonight', timestamp: '2h ago', unread: 0 },
    
    // Groups
    { id: 9, type: 'group', name: 'Project Alpha', lastMessage: 'Meeting notes uploaded', timestamp: '45m ago', unread: 3 },
    { id: 10, type: 'group', name: 'Family', lastMessage: "Dad: Who's bringing the cake?", timestamp: '4h ago', unread: 1 },
    { id: 11, type: 'group', name: 'Hiking Club', lastMessage: 'Weather looks good for Saturday!', timestamp: 'Yesterday', unread: 0 },
  ];

  const chats = [
    { id: 1, name: 'John Doe', lastMessage: 'Hey, how are you?', timestamp: '2m ago', unread: 2 },
    { id: 2, name: 'Jane Smith', lastMessage: 'See you tomorrow!', timestamp: '1h ago', unread: 0 },
    { id: 3, name: 'Bob Johnson', lastMessage: 'Can you send me that file?', timestamp: '3h ago', unread: 1 },
    { id: 4, name: 'Alice Brown', lastMessage: 'Thanks for your help!', timestamp: 'Yesterday', unread: 0 },
    { id: 5, name: 'Charlie Wilson', lastMessage: "Let's meet at 3 PM", timestamp: '2d ago', unread: 0 },
  ];

  const filterConversations = (type: string) => {
    if(type !== 'all'){
      return conversations.filter(conv => 
        conv.type === type && 
        (conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    } else {
      return conversations.filter(conv => 
        conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  };

  const create = (arg: string) => {
    openCreatePage(true);
  }
  const create1 = (arg: string) => {
    const fullname = userdata.firstname + ' ' + userdata.lastname;

    const newChatAttributes = {
      id: 1,
      name: fullname,
      lastMessage: 'Hello, how are you?',
      timestamp: '',
      unread: true,
      chatType: arg as ChatType,
      pinned: false,
      deleted: false,
      archived: false,
      lastUpdated: '',
      participants: [
        { id: userdata.id, name: 'You' },
        { id: 2, name: 'John Doe' },
      ],
      chatSettings: {
        isMuted: false,
        isPinned: false,
        isArchived: false,
        theme: 'light' as ChatSettingsTheme,
        isBlocked: false,
        lastSeen: '',
      },
    };

    chatSystem.addChat(newChatAttributes);
  }

  const tabs = ['All', 'Chats', 'Groups', 'Channels'];

  const onSlideChange = () => {
    if (swiper) {
      setActiveTab(tabs[swiper.activeIndex]);
    }
  };

  return (
    <div className='flex items-center justify-between'>
      <div className='9f4q9d4a h-full bg-white/55 dark:bg-black/55 flex flex-col min-h-screen w-full tablets1:w-2/4 relative'>
        <div className='flex gap-4 items-center justify-between w-full my-1 px-3 py-2'>
          <FontAwesomeIcon onClick={() => router.push('/home')} icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
          <div className='dark:text-slate-200 flex flex-1 items-center justify-between'>
            {loading ? <div className='animate-pulse'>loading...</div> : 
            <div>{userdata ? userdata.username : 'Username'}</div>}
            <Phone size={21} className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out"/>
          </div>
          <button onClick={() => setAyo(!ayo)} className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out">
            {ayo ? <LockKeyhole size={24} /> : <LockKeyholeOpen size={24} />}
          </button>
          <FontAwesomeIcon icon={'ellipsis-h'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
        </div>
        {/*  */}
        <div className='dark:text-slate-200 flex gap-2 items-center justify-between w-full my-2 px-3'>
          <div className='dark:shadow-slate-200 flex flex-grow gap-3 items-center px-3 py-2 rounded-full shadow-bar'>
            <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18' fill='none'>
                <path className='dark:fill-slate-200' fillRule='evenodd' clipRule='evenodd' d='M8.68945 1C12.9293 1 16.3781 4.3727 16.3781 8.51907C16.3781 10.4753 15.6104 12.2595 14.3542 13.5986L16.8261 16.0109C17.0574 16.2371 17.0582 16.6031 16.8269 16.8294C16.7116 16.9436 16.5592 17 16.4076 17C16.2568 17 16.1052 16.9436 15.9892 16.8309L13.4874 14.3912C12.1714 15.4219 10.5028 16.0389 8.68945 16.0389C4.44955 16.0389 1 12.6655 1 8.51907C1 4.3727 4.44955 1 8.68945 1ZM8.68945 2.15821C5.10251 2.15821 2.18433 5.01125 2.18433 8.51907C2.18433 12.0269 5.10251 14.8807 8.68945 14.8807C12.2756 14.8807 15.1938 12.0269 15.1938 8.51907C15.1938 5.01125 12.2756 2.15821 8.68945 2.15821Z' fill='#78828A'></path>
            </svg>
            <input className='bg-transparent border-0 dark:text-slate-200 outline-0 w-full' value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} type='text' placeholder='Search...'/>
          </div>
          <div>Filter</div>
        </div>
        {/*  */}
        <div className='dark:text-slate-200 flex gap-2 items-center justify-between w-full my-2 px-3'>
        {tabs.map((tab) => (
            <div 
              key={tab}
              onClick={() => swiper && swiper.slideTo(tabs.indexOf(tab))}
              className={` cursor-pointer dark:shadow-slate-200 flex items-center justify-center w-1/4 px-1 py-2 rounded-full shadow-bar ${activeTab === tab ? 'bg-brand text-white' : ''}`}
            >
              {tab}
            </div>
          ))}
        </div>
        <Swiper onSwiper={updateSwiper} onSlideChange={onSlideChange} slidesPerView={1} spaceBetween={10} modules={[Pagination, Navigation]} className="dark:text-slate-200 !flex flex-col flex-grow w-full" id='vufqnuju'>
          <SwiperSlide className='flex flex-col flex-grow self-stretch justify-center' style={{ height: 'auto' }}>
            {!ayo ?
              <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="dark:text-slate-200 mt-2 text-sm font-medium text-gray-900">No chats, channels or groups available</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating any or you can join any.</p>
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tomatom"
                    onClick={() => create('chat')}
                  >
                    Start Chat
                  </button>
                </div>
              </div>
              : <ChatListPage filteredChats={() => filterConversations('all')}/>
            }
          </SwiperSlide>
          <SwiperSlide className='flex flex-col flex-grow self-stretch justify-center' style={{ height: 'auto' }}>
              {!ayo ?
                <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="dark:text-slate-200 mt-2 text-sm font-medium text-gray-900">No chats available</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new chat.</p>
                    <div className="mt-6">
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tomatom"
                        onClick={() => create('chat')}
                      >
                        New Chat
                      </button>
                    </div>
                </div>
                : <ChatListPage filteredChats={() => filterConversations('chat')}/>
              }
          </SwiperSlide>
          <SwiperSlide className='flex flex-col flex-grow self-stretch justify-center' style={{ height: 'auto' }}>
            {!ayo ?
              <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="dark:text-slate-200 mt-2 text-sm font-medium text-gray-900">No groups available</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating or joining a new group.</p>
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tomatom"
                    onClick={() => create('group')}
                  >
                    New Group
                  </button>
                </div>
              </div>
              : <ChatListPage filteredChats={() => filterConversations('group')}/>
            }
          </SwiperSlide>
          <SwiperSlide className='flex flex-col flex-grow
           self-stretch justify-center' style={{ height: 'auto' }}>
            {!ayo ?
              <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                <Hash className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="dark:text-slate-200 mt-2 text-sm font-medium text-gray-900">No channels available</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new channel.</p>
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tomatom"
                    onClick={() => create('channel')}
                  >
                    New Channel
                  </button>
                </div>
              </div>
              : <ChatListPage filteredChats={() => filterConversations('channel')}/>
            }
          </SwiperSlide>
        </Swiper>
        {/*  */}
        <div className={`${createPage ? 'absolute' : 'hidden'} bg-white dark:bg-black overflow-auto h-full w-full top-0 z-[1]`}>
          <NewChatMenu openCreatePage={openCreatePage}/>
        </div>
      </div>
      {children}
    </div>
  );
}
