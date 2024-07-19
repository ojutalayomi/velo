'use client'
import React, { useRef, useState } from 'react';
import SwiperCore from 'swiper';
import { Swiper, SwiperSlide, useSwiper } from 'swiper/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '@/app/fontAwesomeLibrary';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useUser } from '@/hooks/useUser';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { Pagination, Navigation } from 'swiper/modules';
import { MessageSquare, Users, Hash } from 'lucide-react';
import NavBar from '@/components/navbar';

export default function App() {
  const { userdata, loading, error, refetchUser } = useUser();
  const router = useRouter();
  const swiperr = useSwiper();
  const [swiper, updateSwiper] = useState<SwiperCore | null>(null);
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Chats', 'Groups', 'Channels'];

  const onSlideChange = () => {
    if (swiper) {
      setActiveTab(tabs[swiper.activeIndex]);
    }
  };

  return (
    <div className='9f4q9d4a h-full bg-white/55 dark:bg-black/55 flex flex-col min-h-screen w-full'>
      <div className='flex gap-4 items-center justify-between w-full my-1 px-3 py-2'>
        <FontAwesomeIcon onClick={() => router.back()} icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out' size="xl" />
        <div className='dark:text-slate-200 flex flex-1 items-center justify-between'>
          {loading ? <div className='animate-pulse'>loading...</div> : 
          <div>{userdata ? userdata.username : 'Username'}</div>}
          <FontAwesomeIcon icon={'arrows-left-right-to-line'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out' size="xl" />
        </div>
        <FontAwesomeIcon icon={'ellipsis-h'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out' size="xl" />
      </div>
      {/*  */}
      <div className='dark:text-slate-200 flex gap-2 items-center justify-between w-full my-2 px-3'>
        <div className='dark:shadow-slate-200 flex flex-grow gap-3 items-center px-3 py-2 rounded-full shadow-bar'>
          <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18' fill='none'>
              <path className='dark:fill-slate-200' fillRule='evenodd' clipRule='evenodd' d='M8.68945 1C12.9293 1 16.3781 4.3727 16.3781 8.51907C16.3781 10.4753 15.6104 12.2595 14.3542 13.5986L16.8261 16.0109C17.0574 16.2371 17.0582 16.6031 16.8269 16.8294C16.7116 16.9436 16.5592 17 16.4076 17C16.2568 17 16.1052 16.9436 15.9892 16.8309L13.4874 14.3912C12.1714 15.4219 10.5028 16.0389 8.68945 16.0389C4.44955 16.0389 1 12.6655 1 8.51907C1 4.3727 4.44955 1 8.68945 1ZM8.68945 2.15821C5.10251 2.15821 2.18433 5.01125 2.18433 8.51907C2.18433 12.0269 5.10251 14.8807 8.68945 14.8807C12.2756 14.8807 15.1938 12.0269 15.1938 8.51907C15.1938 5.01125 12.2756 2.15821 8.68945 2.15821Z' fill='#78828A'></path>
          </svg>
          <input className='bg-transparent border-0 dark:text-slate-200 outline-0 w-full' type='search' placeholder='Search...'/>
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
      <Swiper onSwiper={updateSwiper} onSlideChange={onSlideChange} slidesPerView={1} spaceBetween={10} modules={[Pagination, Navigation]} className="42sjhz11 dark:text-slate-200 flex-grow h-full w-full" >
        <SwiperSlide className='flex flex-col justify-center'>
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="dark:text-slate-200 mt-2 text-sm font-medium text-gray-900">No chats, channels or groups available</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating any or you can join any.</p>
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  New Group
                </button>
              </div>
            </div>
          </div>
        </SwiperSlide>
        <SwiperSlide className='flex flex-col justify-center'>
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="dark:text-slate-200 mt-2 text-sm font-medium text-gray-900">No chats available</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new chat.</p>
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  New Chat
                </button>
              </div>
            </div>
          </div>
        </SwiperSlide>
        <SwiperSlide className='flex flex-col justify-center'>
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="dark:text-slate-200 mt-2 text-sm font-medium text-gray-900">No groups available</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating or joining a new group.</p>
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  New Group
                </button>
              </div>
            </div>
          </div>
        </SwiperSlide>
        <SwiperSlide className='flex flex-col justify-center'>
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <Hash className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="dark:text-slate-200 mt-2 text-sm font-medium text-gray-900">No channels available</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new channel.</p>
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  New Channel
                </button>
              </div>
            </div>
          </div>
        </SwiperSlide>
      </Swiper>
    </div>
  );
}
