'use client'
import React, { useEffect, useRef, useState } from 'react';
import { Copy, Ellipsis, Reply, Send, TextQuote, Trash2, X } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRouter, useParams } from 'next/navigation';
// import Image from 'next/image';
import { useDispatch, useSelector } from 'react-redux';
import { showChat } from '@/redux/navigationSlice';
import { RootState } from '@/redux/store';
// import { useUser } from '@/hooks/useUser'; 

interface NavigationState {
  chaT: string;
}

type Props = {
  message: {
    id: number,
    sender: string,
    text: string,
  }
}

const MessageTab = ({message}:Props) => {
  const [isCopied, setIsCopied] = useState(false);
  const [options,openOptions] = useState<boolean>(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false),3000);
      openOptions(false);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };
  return(
    <div className={`dark:text-gray-400 flex flex-col mb-1`}>

      <div className={`flex flex-1 ${message.sender === "You" ? "flex-row-reverse ml-auto" : "mr-auto"} gap-2 items-center relative`}>
        <div
          className={`mb-1 p-2 rounded-lg overflow-auto w-full flex ${
            message.sender === "You" ? "bg-brand rounded-br-none" : "bg-gray-100 rounded-bl-none dark:bg-zinc-900"
          } text-left`}
        >
          {/* <p className="dark:text-gray-100 font-semibold">{message.sender}</p> */}
          {/* <pre className={'dark:text-white'}>{message.text}</pre> */}
          <p className={'dark:text-white'}>{message.text}</p>
        </div>
        <Ellipsis size={20} className='cursor-pointer dark:text-gray-400' onClick={() => openOptions(!options)}/>
        <div className={`absolute backdrop-blur-sm ${options ? 'block' : 'hidden'} bg-white dark:bg-black flex flex-col gap-2 items-start p-2 rounded-md shadow-md top-full right-1/2 min-w-[120px] z-[3]`}>
          <div className='flex gap-1 items-center cursor-pointer' onClick={() => console.log('.')}>
            <TextQuote size={20} className='dark:text-gray-400'/>
            <span className='text-xs dark:text-white'>Quote</span>
          </div>
          <div className='flex gap-1 items-center cursor-pointer' onClick={copyToClipboard}>
            <Copy size={20} className='dark:text-gray-400'/>
            <span className='text-xs dark:text-white'>{isCopied ? 'Copied!' : 'Copy message'}</span>
          </div>
          <div className='flex gap-1 items-center cursor-pointer' onClick={() => console.log('.')}>
            <Trash2 size={20} className='dark:text-gray-400'/>
            <span className='text-xs dark:text-white'>Delete</span>
          </div>
        </div>
      </div>

      <div className={`${message.sender === "You" ? "text-right" : "text-left"} text-slate-600 text-sm`}>Time</div>

    </div>
  )
}

const ChatPage: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  // const params = useParams<{ chat: string }>();
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

  const handleSendMessage = () => {
    if (newMessage.trim() !== '') {
      const textArea = textAreaRef.current;
      if (textArea) textArea.style.height = '40px';
      setMessages([...messages, { id: messages.length + 1, text: newMessage, sender: "You" }]);
      setNewMessage('');
    }
  };

  const handleClick = () => {
    dispatch(showChat('hidden'));
    router.push('/chats');
  }

  return (
    <div className={`bg-white tablets:bg-white/55 tablets:flex ${chaT} dark:bg-black/55 shadow-md flex flex-col min-h-screen max-h-screen flex-1 rounded-lg overflow-hidden absolute tablets:relative tablets:w-auto h-full w-full z-10`}>
        <div className="bg-gray-100 dark:bg-zinc-900 dark:text-slate-200 flex gap-4 items-center justify-start p-2 border-b">
          <FontAwesomeIcon onClick={handleClick} icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
          <h2 className="text-lg font-semibold text-center">Chat with John</h2>
        </div>
        <div className="h-96 overflow-y-auto p-4 flex flex-col flex-1">
          <div className="mb-4 flex-1">
            {messages.map((message) => (
              <MessageTab key={message.id} message={message}/>
            ))}
          </div>
        </div>
        <div className="flex flex-col flex-[1_1_80%] p-2">
          <div className="flex items-center px-2">
            Ayomide
            <X size={20} />
          </div>
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
              onClick={handleSendMessage}
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