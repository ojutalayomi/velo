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
  chaT: boolean;
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
    <div className={`bg-white tablets:bg-white/55 tablets:flex ${!chaT ? 'hidden' : ''} dark:bg-black/55 shadow-md flex flex-col min-h-screen flex-1 rounded-lg overflow-hidden absolute tablets:relative tablets:w-auto w-full z-10`}>
        <div className="bg-gray-100 flex gap-4 items-center justify-start p-2 border-b">
          <FontAwesomeIcon onClick={() => dispatch(showChat(!chaT))} icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out' size="xl" />
          <h2 className="text-lg font-semibold text-center">Chat with John</h2>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="h-96 overflow-y-auto mb-4 flex-1">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-2 p-2 rounded-lg ${
                  message.sender === "You" ? "bg-blue-100 ml-auto" : "bg-gray-100"
                } max-w-[80%] ${message.sender === "You" ? "text-right" : "text-left"}`}
              >
                <p className="font-semibold">{message.sender}</p>
                <p>{message.text}</p>
              </div>
            ))}
          </div>
          <div className="flex">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              // onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-grow mr-2 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
  );
};

export default ChatPage;