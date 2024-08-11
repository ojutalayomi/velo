'use client'
import React, { useEffect, useRef, useState } from 'react';
import { Copy, Ellipsis, Reply, Send, TextQuote, Trash2, X } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRouter, useParams } from 'next/navigation';
import MessageTab from './MessageTab';
// import Image from 'next/image';
import { useDispatch, useSelector } from 'react-redux';
import { showChat } from '@/redux/navigationSlice';
import { RootState } from '@/redux/store';
// import { useUser } from '@/hooks/useUser'; 

interface NavigationState {
  chaT: string;
}

type Message = {
  id: number,
  sender: string,
  text: string,
}

type QuoteProp = {
  message: Message,
  state: boolean | undefined
}

const initialQuoteState = {
  message: {
    id: 0,
    sender: '',
    text: '',
  },
  state: false
}

const ChatPage: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [quote,setQuote] = useState<QuoteProp>(initialQuoteState);
  // const params = useParams<{ chat: string }>();
  const { chaT } = useSelector<RootState, NavigationState>((state) => state.navigation);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hey there!", sender: "John", quotedMessage: 0 },
    { id: 2, text: "Hi! How are you?", sender: "You", quotedMessage: 0 },
    { id: 3, text: "I'm doing great, thanks for asking!", sender: "John", quotedMessage: 2 },
  ]);
  const [newMessage, setNewMessage] = useState('');


  useEffect(() => {
      const handleInput = () => {
          const textArea = textAreaRef.current;
          if (textArea) {
              textArea.style.height = '40px';
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

  const handleSendMessage = (id: number) => {
    if (newMessage.trim() !== '') {
      const textArea = textAreaRef.current;
      if (textArea) textArea.style.height = '40px';
      setMessages([...messages, { id: messages.length + 1, text: newMessage, sender: "You", quotedMessage: id }]);
      setNewMessage('');
      closeQuote();
    }
  };

  const closeQuote = () => {
    setQuote(initialQuoteState)
  }

  const handleClick = () => {
    dispatch(showChat('hidden'));
    router.push('/chats');
  }

  return (
    <div className={`bg-white tablets1:bg-white tablets1:flex ${chaT} dark:bg-black/55 shadow-md flex flex-col min-h-screen max-h-screen flex-1 rounded-lg overflow-hidden absolute tablets1:relative tablets1:w-auto h-full w-full z-10`}>
        <div className="bg-gray-100 dark:bg-zinc-900 dark:text-slate-200 flex gap-4 items-center justify-start p-2 border-b">
          <FontAwesomeIcon onClick={handleClick} icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
          <h2 className="text-lg font-semibold text-center">Chat with John</h2>
        </div>
        <div className="h-96 overflow-y-auto p-4 flex flex-col flex-1">
          <div className="mb-4 flex-1">
            {messages.map((message) => (
              <>
              {message.quotedMessage !== 0 && (
                <div className={`flex m-1 ${message.sender === "You" ? "flex-row-reverse ml-auto" : "mr-auto"}`}>
                  <div className={`bg-brand border-white dark:text-white rounded-lg text-xs p-2`}>
                    {messages?.find(m => m.id === message.quotedMessage)?.text.substring(0, 40) || ''}
                  </div>
                </div>
              )}
              <MessageTab key={message.id} message={message} setQuote={setQuote}/>
              </>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-[5px] p-2">
            {quote.state &&
              <div className="bg-gray-100 dark:bg-zinc-900 dark:text-slate-200 mb-1 p-2 w-full rounded-lg flex items-center justify-between px-2">

              <div className='flex-1'>{quote.message?.text.substring(0, 50)}</div>
                <X size={20} className='cursor-pointer' onClick={closeQuote}/>
              </div>
            }
          <div className="flex items-end basis-[content] px-2">
            <textarea
              placeholder="Type a message..."
              value={newMessage}
              ref={textAreaRef}
              onChange={(e) => setNewMessage(e.target.value)}
              // onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="dark:bg-zinc-900 dark:text-slate-200 flex-grow h-10 max-h-40 mr-2 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
            ></textarea>
            <button
              onClick={() => handleSendMessage(quote.message.id)}
              className="bg-brand text-white p-2 rounded-lg max-h-40 hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
  );
};

export default ChatPage;