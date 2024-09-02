'use client'
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Copy, Ellipsis, Reply, Send, Settings, TextQuote, Trash2, X } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRouter, useParams } from 'next/navigation';
import MessageTab from './MessageTab';
// import Image from 'next/image';
import { useDispatch, useSelector } from 'react-redux';
import { ConvoType, setConversations, setMessages, addMessages, deleteMessage } from '@/redux/chatSlice';
import { showChat } from '@/redux/navigationSlice';
import { RootState } from '@/redux/store';
import { useUser } from '@/hooks/useUser';
import { AllChats, ChatAttributes, ChatSettings, Err, MessageAttributes, NewChat, NewChatResponse, NewChatSettings } from '@/lib/types/type';
import { ObjectId } from 'mongodb';

interface NavigationState {
  chaT: string;
}

type Message = {
  _id: string,
  senderId: string,
  content: string,
}

type QuoteProp = {
  message: Message,
  state: boolean | undefined
}

const initialQuoteState = {
  message: {
    _id: '',
    senderId: '',
    content: '',
  },
  state: false
}

interface ChatSetting {
  [x: string]: NewChatSettings
}

interface CHT {
  messages: MessageAttributes[],
  settings: ChatSetting,
  conversations: ConvoType[];
}

const generateObjectId = () => {
  const timestamp = Math.floor(new Date().getTime() / 1000).toString(16);
  const machineId = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  const processId = Math.floor(Math.random() * 65535).toString(16).padStart(4, '0');
  const counter = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  
  return timestamp + machineId + processId + counter;
}

const ChatPage = ({ children }: Readonly<{ children: React.ReactNode;}>) => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const { userdata, loading, error, refetchUser } = useUser();
  const { messages , settings, conversations } = useSelector<RootState, CHT>((state) => state.chat);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [quote,setQuote] = useState<QuoteProp>(initialQuoteState);
  const [isNew,setNew] = useState<boolean>(true);
  const [load,setLoading] = useState<boolean>();
  const [err,setError] = useState<boolean>();
  const [newMessage, setNewMessage] = useState('');
  const [newPerson,setNewPerson] = useState<{[x: string]: any}>([]);
  const pid = params?.id as string;
  const chat = settings[pid];
  const friendId = chat?.members.find((id: string) => id !== userdata._id) as string;
  const url = 'https://s3.amazonaws.com/profile-display-images/';
  const { chaT } = useSelector<RootState, NavigationState>((state) => state.navigation);

  useEffect(() => {
    dispatch(showChat(''));
  }, [dispatch]);
  
  const Messages = messages.filter( msg => msg.chatId === pid ) as MessageAttributes[];

  const fetchData = useCallback(async () => {
      setLoading(true);

      try {
          if(friendId) {
            const response = await fetch('/api/users?query='+encodeURIComponent(friendId)+'&search=true');
            if (!response.ok) {
              throw new Error('Failed to fetch');
            }
            const data = await response.json();
            setNewPerson(data[0]);
          }
      } catch (error) {
          setError(true);
      } finally {
          setLoading(false);
      }
  }, [friendId])

  
  useEffect(() => {
    fetchData()
  }, [fetchData])

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

  const handleSendMessage = (id: string) => {
    if (newMessage.trim() !== '') {
      const textArea = textAreaRef.current;
      if (textArea) textArea.style.height = '40px';
      const msg = { 
        _id: generateObjectId(),
        chatId: pid, 
        senderId: userdata._id,
        receiverId: friendId,
        content: newMessage, 
        timestamp: new Date().toISOString(),
        messageType: 'Chats',
        isRead: { 
          [userdata._id]: true,
          [friendId]: false 
        }, // Object with participant IDs as keys and their read status as values
        reactions: [],
        attachments: [],
        quotedMessage: id,
      }
      dispatch(addMessages(msg));
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
    <div className={`bg-white tablets1:bg-white tablets1:flex ${chaT} dark:bg-black/55 shadow-md flex flex-col min-h-screen max-h-screen flex-1 rounded-lg overflow-hidden mobile:absolute tablets1:w-auto h-full w-full z-10 tablets1:z-[unset]`}>
      <div className="bg-gray-100 dark:bg-zinc-900 dark:text-slate-200 flex gap-4 items-center justify-between p-2 border-b">
        <div className='flex gap-4 items-center justify-start'>
          <FontAwesomeIcon onClick={handleClick} icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
          {load
            ? <span className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1" />
            :
          <h2 className="text-lg font-semibold text-center">{newPerson?.name}</h2>
          }
        </div>
        <Settings 
        className='text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]'
        onClick={() => router.push(`/chats/${params?.id}/settings`)}
        />
      </div>
      <div className="h-96 overflow-y-auto p-4 flex flex-col flex-1"> 
        <div className="cursor-pointer flex flex-col gap-2 items-center">
          {load
          ? <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse" />
          : <Image 
            src={
            newPerson?.dp || newPerson?.displayPicture  
            ? (newPerson?.dp ? url+newPerson?.dp : (
              newPerson?.displayPicture.includes('ila-') 
              ? '/default.jpeg'
              : url +  newPerson?.displayPicture
              )) 
            : '/default.jpeg'} 
            className='displayPicture dark:border-slate-200 w-20 h-20 rounded-full' 
            width={64} height={64} alt='Display Picture'
          />
          }
          
          <div className='text-center'>
            <p className="flex items-center justify-center font-bold dark:text-slate-200 text-sm">
            {load
            ? <span className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1" />
            : (
                <>
                  {newPerson?.name ? newPerson.name : <span className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1" />}
                  {newPerson?.verified && 
                    <Image src='/verified.svg' className='verified border-0' width={20} height={20} alt='Verified tag'/>
                  }
                </>
              )
            }
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{load || !newPerson?.username ? <span className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1" /> : '@'+newPerson.username }</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{load || !newPerson?.bio ? <span className="w-36 h-4 bg-gray-200 rounded animate-pulse mb-1" /> :  newPerson.bio}</p>
          </div>
        </div>
        <div className="mb-4 mt-4 flex-1">
          {Messages.map((message) => (
            <Fragment key={`${generateObjectId()}`}>
            {message.quotedMessage !== '' && (
              <div className={`flex m-1 ${message.senderId === userdata._id ? "flex-row-reverse ml-auto" : "mr-auto"}`}>
                <div className={`bg-brand border-white dark:text-white rounded-lg text-xs p-2`}>
                  {Messages?.find(m => m._id as string === message.quotedMessage)?.content.substring(0, 40) || ''}
                </div>
              </div>
            )}
            <MessageTab key={message._id as string} message={message} setQuote={setQuote}/>
            </Fragment>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-[5px] p-2">
          {quote.state &&
            <div className="bg-gray-100 dark:bg-zinc-900 dark:text-slate-200 mb-1 p-2 w-full rounded-lg flex items-center justify-between px-2">

            <div className='flex-1'>{quote.message?.content.substring(0, 50)}</div>
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
            onClick={() => handleSendMessage(quote.message._id)}
            className="bg-brand text-white p-2 rounded-lg max-h-40 hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
};

export default ChatPage;