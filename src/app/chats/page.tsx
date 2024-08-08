'use client'
import React, { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useDispatch, useSelector } from 'react-redux';
import { showChat } from '@/redux/navigationSlice';
import { RootState } from '@/redux/store'; 

interface NavigationState {
  chaT: string;
}

const ChatPage: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { chaT } = useSelector<RootState, NavigationState>((state) => state.navigation);
  useEffect(() => {
    dispatch(showChat('hidden'));
  }, [dispatch]);

  return (
    <div className={`bg-white tablets1:bg-white/55 tablets1:flex ${chaT} dark:bg-black/55 shadow-md flex flex-col min-h-screen flex-1 rounded-lg overflow-hidden absolute tablets1:relative tablets1:w-auto h-full w-full z-10`}>
        <div className="p-4 flex flex-col flex-1 justify-center gap-2 items-center">
          <h1 className='dark:text-white font-semibold text-2xl'>Select a message</h1>
          <p className='dark:text-slate-200 text-sm text-center'>Choose from your existing conversations, start a new one, or just keep swimming.</p>
          <button
            onClick={() => console.log('new chat')}
            className="bg-brand flex items-center justify-center gap-2 text-white px-4 py-3 rounded-full hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <span>New message</span>
            <Send size={20} />
          </button>
        </div>
      </div>
  );
};

export default ChatPage;