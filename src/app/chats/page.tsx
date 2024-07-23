'use client'
import React, { useState } from 'react';
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
  const [messages, setMessages] = useState([
    { id: 1, text: "Hey there!", sender: "John" },
    { id: 2, text: "Hi! How are you?", sender: "You" },
    { id: 3, text: "I'm doing great, thanks for asking!", sender: "John" },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim() !== '') {
      setMessages([...messages, { id: messages.length + 1, text: newMessage, sender: "You" }]);
      setNewMessage('');
    }
  };

  return (
    <div className={`bg-white tablets:bg-white/55 tablets:flex ${chaT} dark:bg-black/55 shadow-md flex flex-col min-h-screen flex-1 rounded-lg overflow-hidden absolute tablets:relative tablets:w-auto h-full w-full z-10`}>
        <div className="p-4 flex flex-col flex-1 justify-center gap-2 items-center">
          <h1 className='dark:text-white font-semibold text-2xl'>Select a message</h1>
          <p className='dark:text-slate-200 text-sm text-center'>Choose from your existing conversations, start a new one, or just keep swimming.</p>
          <button
            onClick={handleSendMessage}
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