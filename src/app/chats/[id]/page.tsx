'use client'
import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { useDispatch, useSelector } from 'react-redux';
import { showChat } from '@/redux/navigationSlice';
import { RootState } from '@/redux/store';
import { useUser } from '@/hooks/useUser'; 

interface NavigationState {
  chaT: string;
}

const ChatPage: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const params = useParams<{ chat: string }>()
  const { chaT } = useSelector<RootState, NavigationState>((state) => state.navigation);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hey there!", sender: "John" },
    { id: 2, text: "Hi! How are you?", sender: "You" },
    { id: 3, text: "I'm doing great, thanks for asking!", sender: "John" },
  ]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
      const handleInput = () => {
          const textArea = textAreaRef.current;
          if (textArea) {
              textArea.style.height = '30px';
              textArea.style.height = `${textArea.scrollHeight}px`;
          }
      };

      const textArea = textAreaRef.current;
      if (textArea) {
          textArea.addEventListener('input', handleInput);
          return () => {
              textArea.removeEventListener('input', handleInput);
          };
      }
  }, []);

  const handleSendMessage = () => {
    if (newMessage.trim() !== '') {
      setMessages([...messages, { id: messages.length + 1, text: newMessage, sender: "You" }]);
      setNewMessage('');
    }
  };

  return (
    <div className={`bg-white tablets:bg-white/55 tablets:flex ${chaT} dark:bg-black/55 shadow-md flex flex-col min-h-screen flex-1 rounded-lg overflow-hidden absolute tablets:relative tablets:w-auto h-full w-full z-10`}>
        <div className="bg-gray-100 dark:bg-zinc-900 dark:text-slate-200 flex gap-4 items-center justify-start p-2 border-b">
          <FontAwesomeIcon onClick={() => dispatch(showChat('hidden'))} icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out' size="xl" />
          <h2 className="text-lg font-semibold text-center">Chat with John</h2>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="h-96 overflow-y-auto mb-4 flex-1">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-2 p-2 rounded-lg ${
                  message.sender === "You" ? "bg-brand ml-auto" : "bg-gray-100 dark:bg-zinc-900"
                } max-w-[80%] ${message.sender === "You" ? "text-right" : "text-left"}`}
              >
                {/* <p className="dark:text-gray-100 font-semibold">{message.sender}</p> */}
                <p className='dark:text-white'>{message.text}</p>
              </div>
            ))}
          </div>
          <div className="flex">
            <textarea
              placeholder="Type a message..."
              value={newMessage}
              ref={textAreaRef}
              onChange={(e) => setNewMessage(e.target.value)}
              // onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="dark:bg-zinc-900 dark:text-slate-200 flex-grow mr-2 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
            ></textarea>
            <button
              onClick={handleSendMessage}
              className="bg-brand text-white p-2 rounded-lg hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
  );
};

export default ChatPage;