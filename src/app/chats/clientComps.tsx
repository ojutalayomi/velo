'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import SwiperCore from 'swiper';
import { Swiper, SwiperSlide, useSwiper } from 'swiper/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '@/app/fontAwesomeLibrary';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useDispatch, useSelector } from 'react-redux';
import { addConversation, addMessages, ConvoType, updateConversation, setConversations } from '@/redux/chatSlice';
import { RootState } from '@/redux/store'; 
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { Pagination, Navigation } from 'swiper/modules';
import { MessageSquare, Pin, PinOff, Users, Hash, Search, Archive, Phone, LockKeyholeOpen, LockKeyhole, MessageCirclePlus } from 'lucide-react';
import ChatListPage from './ChatListPage';
import NewChatMenu from './NewChatMenu';
import { useSocket } from '@/hooks/useSocket';
import { MessageAttributes } from '@/lib/types/type';

interface NavigationState {
  chaT: string;
}
interface ConvoTypeProp {
  conversations: ConvoType[];
}

export default function App({ children }: Readonly<{ children: React.ReactNode;}>) {
  const { userdata, loading, error, refetchUser } = useUser();
  const router = useRouter();
  const dispatch = useDispatch();
  const socket = useSocket(userdata._id);
  const { chaT } = useSelector<RootState, NavigationState>((state) => state.navigation);
  const { conversations } = useSelector<RootState, ConvoTypeProp>((state) => state.chat);
  const [ayo, setAyo] = useState<boolean>(true);
  const [swiper, updateSwiper] = useState<SwiperCore | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [createPage, openCreatePage] = useState(false);


  // console.log(conversations);
  const filterConversations = (type: string) => {
    if(type !== 'all' && type !== 'Archived' && type !== 'Pinned'){
      return conversations?.filter(conv => 
        conv.type === type && !conv.archived && !conv.deleted && !conv.pinned &&
        (conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    } else if (type === 'Archived') {
      return conversations?.filter(conv =>
        conv.archived && 
        (conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    } else if (type === 'Pinned') {
      return conversations?.filter(conv =>
        conv.pinned && !conv.archived && !conv.deleted &&
        (conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    } else {
      return conversations?.filter(conv => 
        !conv.archived && !conv.deleted && !conv.pinned &&
        (conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
  };

  const create = (arg: string) => {
    openCreatePage(true);
  }

  const tabs = ['All', 'DMs', 'Groups', 'Archived'];

  const onSlideChange = () => {
    if (swiper) {
      setActiveTab(tabs[swiper.activeIndex]);
    }
  };

  return (
    <div className={`flex items-center justify-between ${!chaT && 'relative'}`}>
      <div className='9f4q9d4a bg-white/55 dark:bg-black/55 flex flex-col h-screen w-full tablets1:w-2/4 relative'>
        <div className='flex gap-4 items-center justify-between w-full my-1 px-3 py-2'>
          <FontAwesomeIcon onClick={() => router.push('/home')} icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
          <div className='dark:text-slate-200 flex flex-1 items-center justify-between'>
            {loading ? <div className='animate-pulse'>loading...</div> : 
            <div>{userdata ? userdata.username : 'Username'}</div>}
            <Phone size={21} className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out"/>
          </div>
          <MessageCirclePlus size={21} onClick={() => create('chat')} className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out"/>
          <button onClick={() => setAyo(!ayo)} className={`text-gray-600 ${userdata.username !== 'Ojutalayo' && 'hidden'} hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out`}>
            {ayo ? <LockKeyholeOpen size={21} /> : <LockKeyhole size={21} />}
          </button>
          <FontAwesomeIcon icon={'ellipsis-h'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
        </div>
        {/* Search */}
        <div className='dark:text-slate-200 flex gap-2 items-center justify-between w-full my-2 px-3'>
          <div className='dark:shadow-slate-200 flex flex-grow gap-3 items-center px-3 py-2 rounded-full shadow-bar'>
            <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18' fill='none'>
                <path className='dark:fill-slate-200' fillRule='evenodd' clipRule='evenodd' d='M8.68945 1C12.9293 1 16.3781 4.3727 16.3781 8.51907C16.3781 10.4753 15.6104 12.2595 14.3542 13.5986L16.8261 16.0109C17.0574 16.2371 17.0582 16.6031 16.8269 16.8294C16.7116 16.9436 16.5592 17 16.4076 17C16.2568 17 16.1052 16.9436 15.9892 16.8309L13.4874 14.3912C12.1714 15.4219 10.5028 16.0389 8.68945 16.0389C4.44955 16.0389 1 12.6655 1 8.51907C1 4.3727 4.44955 1 8.68945 1ZM8.68945 2.15821C5.10251 2.15821 2.18433 5.01125 2.18433 8.51907C2.18433 12.0269 5.10251 14.8807 8.68945 14.8807C12.2756 14.8807 15.1938 12.0269 15.1938 8.51907C15.1938 5.01125 12.2756 2.15821 8.68945 2.15821Z' fill='#78828A'></path>
            </svg>
            <input className='bg-transparent border-0 dark:text-slate-200 outline-0 w-full' value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} type='text' placeholder='Search...'/>
          </div>
          <div>Filter</div>
        </div>
        {/* Tabs */}
        <div className='dark:text-slate-200 flex gap-2 items-center justify-between w-full my-2 px-3'>
        {tabs.map((tab) => (
            <div 
              key={tab}
              onClick={() => swiper && swiper.slideTo(tabs.indexOf(tab))}
              className={` cursor-pointer dark:shadow-slate-200 flex items-center justify-center w-1/4 px-1 py-1 rounded-full shadow-bar ${activeTab === tab ? 'bg-brand text-white' : ''}`}
            >
              {tab}
            </div>
          ))}
        </div>
        {/* Pinned */}
        <div className="dark:text-slate-200 flex items-center justify-between w-full px-3 py-2">
          <h2 className="text-lg font-semibold">Pinned</h2>
          <Pin size={21} 
          className={`text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out {filterConversations('Pinned').length > 0 ? 'block' : 'hidden'}`}
          onClick={() => {
            const selectedChats = filterConversations('all').filter(chat => chat.pinned);
            if (selectedChats.length > 0) {
              // If there are pinned chats, slide to the Pinned tab
              swiper && swiper.slideTo(tabs.indexOf('Pinned'));
            } else {
              // If no chats are pinned, show a modal or alert to select chats to pin
              alert('No pinned chats. Please select chats to pin first.');
              // Here you could also open a modal to select chats to pin
            }
          }}
          />
        </div>
        <div className="px-3">
          {filterConversations('Pinned').length > 0 ? (
            <ChatListPage filteredChats={() => filterConversations('Pinned')}/>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No pinned chats</p>
          )}
        </div>
        {/* Slider */}
        <Swiper onSwiper={updateSwiper} onSlideChange={onSlideChange} slidesPerView={1} spaceBetween={10} modules={[Pagination, Navigation]} className="dark:text-slate-200 !flex flex-col flex-grow w-full" id='vufqnuju'>
          <SwiperSlide className='flex flex-col flex-grow self-stretch justify-center' style={{ height: 'auto' }}>
            {!ayo || filterConversations('all').length === 0 ?
              <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="dark:text-slate-200 mt-2 text-sm font-medium text-gray-900">No chats, groups or archived chats available</h3>
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
              {!ayo || filterConversations('DMs').length === 0 ?
                <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="dark:text-slate-200 mt-2 text-sm font-medium text-gray-900">No chats available</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new chat.</p>
                    <div className="mt-6">
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tomatom"
                        onClick={() => create('DMs')}
                      >
                        New Chat
                      </button>
                    </div>
                </div>
                : <ChatListPage filteredChats={() => filterConversations('DMs')}/>
              }
          </SwiperSlide>
          <SwiperSlide className='flex flex-col flex-grow self-stretch justify-center' style={{ height: 'auto' }}>
            {!ayo || filterConversations('Groups').length === 0 ?
              <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="dark:text-slate-200 mt-2 text-sm font-medium text-gray-900">No groups available</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating or joining a new group.</p>
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tomatom"
                    onClick={() => create('Groups')}
                  >
                    New Group
                  </button>
                </div>
              </div>
              : <ChatListPage filteredChats={() => filterConversations('Groups')}/>
            }
          </SwiperSlide>
          <SwiperSlide className='flex flex-col flex-grow
           self-stretch justify-center' style={{ height: 'auto' }}>
            {!ayo || filterConversations('Archived').length === 0 ?
              <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                <Archive className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="dark:text-slate-200 mt-2 text-sm font-medium text-gray-900">No archive available</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding chats to your archive.</p>
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tomatom"
                    onClick={() => create('Archived')}
                  >
                    Add to archive
                  </button>
                </div>
              </div>
              : <ChatListPage filteredChats={() => filterConversations('Archived')}/>
            }
          </SwiperSlide>
        </Swiper>
        {/*  */}
        <div className={`${createPage ? 'absolute z-[1]' : 'hidden z-[1]'} bg-gray-100 dark:bg-zinc-900 overflow-auto h-full w-full top-0`}>
          <NewChatMenu openCreatePage={openCreatePage}/>
        </div>
      </div>
      {children}
    </div>
  );
}
