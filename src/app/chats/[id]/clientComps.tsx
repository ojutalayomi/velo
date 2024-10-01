'use client'
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { AllChats, ChatAttributes, ChatSettings, Err, GroupMessageAttributes, MessageAttributes, NewChat, NewChatResponse, NewChatSettings } from '@/lib/types/type';
import Image from 'next/image';
import { Copy, Ellipsis, Reply, Send, Settings, TextQuote, Trash2, X } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRouter, useParams } from 'next/navigation';
import MessageTab from '../MessageTab';
import { useDispatch, useSelector } from 'react-redux';
import { ConvoType, setConversations, updateConversation, setMessages, addMessages, deleteMessage } from '@/redux/chatSlice';
import { showChat } from '@/redux/navigationSlice';
import { RootState } from '@/redux/store';
import { useUser } from '@/hooks/useUser';
import { useSocket } from '@/app/providers';

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
  messages: (MessageAttributes | GroupMessageAttributes)[],
  settings: ChatSetting,
  conversations: ConvoType[],
  loading: boolean,
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
  const { messages , settings, conversations, loading: convoLoading } = useSelector<RootState, CHT>((state: RootState) => state.chat);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [quote,setQuote] = useState<QuoteProp>(initialQuoteState);
  const [isNew,setNew] = useState<boolean>(true);
  const [load,setLoading] = useState<boolean>();
  const [err,setError] = useState<boolean>();
  const [newMessage, setNewMessage] = useState('');
  const [newPerson,setNewPerson] = useState<{[x: string]: any}>([]);
  const pid = params?.id as string;
  const socket = useSocket();
  const convo = conversations?.find(c => c.id === pid);
  const chat = settings?.[pid];
  const friendId = convo?.participants?.find((id: string) => id !== userdata._id) as string;
  const url = 'https://s3.amazonaws.com/profile-display-images/';
  const { chaT } = useSelector((state: RootState) => state.navigation);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastDate,setLastDate] = useState<string>();

  useEffect(() => {
    dispatch(showChat(''));
  }, [dispatch]);

  useEffect(() => {
    if (convo && convo.unread !== 0 && !convoLoading) {
      // setUnreads(0);
      dispatch(updateConversation({ id: convo.id, updates: { unread: 0 } }));
    }
  }, [convo, convoLoading, dispatch, convo?.unread])
  
  const Messages = messages?.filter( msg => msg.chatId === pid ) as MessageAttributes[];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);

    const getCachedData = (id: string) => {
      const cachedData = localStorage.getItem(id);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        if (Date.now() - parsedData.timestamp < (60000 * 5)) { // Cache for 5 minutes
          return parsedData.data;
        } else {
          localStorage.removeItem(id);
        }
      }
      return null;
    };

    const fetchFromAPI = async (id: string) => {
      const response = await fetch(`/api/users?query=${encodeURIComponent(id)}&search=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      const data = await response.json();
      localStorage.setItem(data[0]._id, JSON.stringify({
        data: data[0],
        timestamp: Date.now()
      }));
      return data[0];
    };

    try {
      if (friendId) {
        const cachedData = getCachedData(friendId);
        if (cachedData) {
          setNewPerson(cachedData);
        } else {
          const apiData = await fetchFromAPI(friendId);
          setNewPerson(apiData);
        }
      } else {
        // If friendId is not available, try to fetch using pid
        const cachedData = getCachedData('userdata');
        if (cachedData) {
          setNewPerson(cachedData);
        } else {
          const apiData = await fetchFromAPI(userdata._id);
          setNewPerson(apiData);
        }
      }
    } catch (error) {
      setError(true);
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [friendId, userdata]);

  useEffect(() => {
    if (!friendId && !convo && !convoLoading) {
      console.log('Redirecting to /chats due to missing friendId and convo');
      router.push('/chats');
    }
  }, [convo, convoLoading, friendId, router]);

  useEffect(() => {
    fetchData()
  }, [fetchData, friendId, pid])

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

      const isRead = friendId ? { [userdata._id]: false, [friendId]: true } : { [userdata._id]: true };

      const msg = { 
        _id: generateObjectId(),
        chatId: pid, 
        senderId: userdata._id,
        receiverId: friendId,
        content: newMessage, 
        timestamp: new Date().toISOString(),
        messageType: 'DMs',
        isRead: isRead, // Object with participant IDs as keys and their read status as values
        reactions: [],
        attachments: [],
        quotedMessage: id,
      }
      // dispatch(addMessages(msg));
      if (msg && socket) {
        socket.emit('chatMessage', msg)
        // dispatch(updateConversation({ id: convo.id, lastMessage: msg.content }));
        setNewMessage('')
      }
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

  const handleTyping = () => {
    if (!socket || !pid) return;
    const details = { userId: userdata._id, to: friendId, chatId: pid };
    socket.emit('typing', { userId: userdata._id, to: friendId, chatId: pid });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { userId: userdata._id, to: friendId, chatId: pid });
    }, 3000);
  };

  return (
    <div className={`bg-bgLight tablets1:flex ${chaT}  dark:bg-bgDark shadow-md flex flex-col min-h-screen max-h-screen flex-1 rounded-lg overflow-hidden mobile:absolute tablets1:w-auto h-full w-full z-10 tablets1:z-[unset]`}>
      <div className="bg-gray-100 dark:bg-zinc-900 dark:text-slate-200 flex gap-4 items-center justify-between px-3 py-2 sticky top-0 bottom-0">
        <div className='flex gap-4 items-center justify-start'>
          <FontAwesomeIcon onClick={handleClick} icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
          {load
            ? <span className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1" />
            :
            <div>
              <div className="flex items-center text-sm font-semibold text-left">
                <div className='truncate'>{newPerson?.name}</div>
                {newPerson?.verified && 
                  <Image src='/verified.svg' className='verified border-0' width={20} height={20} alt='Verified tag'/>
                }
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {convo?.online ? 'Online' : 'Offline'}
                {convo?.isTyping[friendId] && ' • Typing...'}
              </p>
            </div>
          }
        </div>
        <Settings 
        className='text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]'
        onClick={() => router.push(`/chats/${params?.id}/settings`)}
        />
      </div>
      <div className="h-96 overflow-y-auto p-4 flex flex-col flex-1"> 
        <div className="cursor-pointer flex flex-col gap-2 items-center relative">
          {load ? (
            <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse" />
          ) : (
            <>
              <div className="relative">
                <Image 
                  src={
                    newPerson?.dp || newPerson?.displayPicture  
                      ? (newPerson?.dp 
                          ? url + newPerson.dp 
                          : (newPerson.displayPicture.includes('ila-') 
                              ? '/default.jpeg'
                              : url + newPerson.displayPicture
                            )
                        ) 
                      : '/default.jpeg'
                  } 
                  className='displayPicture dark:border-slate-200 w-20 h-20 rounded-full object-cover' 
                  width={80} 
                  height={80} 
                  alt='Display Picture'
                />
                {convo?.online && (
                  <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900"></div>
                )}
              </div>
            </>
          )}
          
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
          {Messages?.reduce((acc: JSX.Element[], message, index) => {
            const messageDate = new Date(message.timestamp).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

            // Check if the current message date is different from the last displayed date
            if (messageDate !== lastDate) {
              acc.push(
                <div key={`date-${messageDate}`} data-date={messageDate} className="text-center text-gray-500 my-2">
                  {messageDate}
                </div>
              );
            }
            setLastDate(messageDate);

            acc.push(
              <Fragment key={message._id as string}>
                {message.quotedMessage !== '' && (
                  <div className={`flex m-1 ${message.senderId === userdata._id ? "flex-row-reverse ml-auto" : "mr-auto"}`}>
                    <div className={`${message.senderId === userdata._id ? "bg-gray-100 dark:bg-zinc-900" : "bg-brand"} border-white dark:text-white rounded-lg shadow-md text-xs p-2`}>
                      {Messages?.find(m => m._id as string === message.quotedMessage)?.content.substring(0, 40) || ''}
                    </div>
                  </div>
                )}
                <MessageTab key={message._id as string} message={message} setQuote={setQuote} />
              </Fragment>
            );

            return acc;
          }, [])}
        </div>
      </div>
      <div className="flex flex-col gap-[5px] p-2 sticky top-0 bottom-0">
          {quote.state &&
            <div className="bg-gray-100 dark:bg-zinc-900 dark:text-slate-200 mb-1 p-2 w-full rounded-lg flex items-center justify-between px-2">

            <div className='flex-1'>{quote.message?.content.substring(0, 50)}</div>
              <X size={20} className='cursor-pointer' onClick={closeQuote}/>
            </div>
          }
        <div className="flex items-end basis-[content] px-2">
          <textarea
            placeholder="Type a message..."
            // disabled={!socket?.connected}
            value={newMessage}
            ref={textAreaRef}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(quote.message?._id);
              }
            }}
            className="dark:bg-zinc-900 dark:text-slate-200 flex-grow h-10 max-h-40 mr-2 p-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand focus:rounded-lg"
          ></textarea>
          <button
            // disabled={!socket?.connected}
            onClick={() => handleSendMessage(quote.message?._id)}
            className="bg-brand text-white p-2 rounded-full max-h-40 hover:bg-tomato focus:outline-none focus:ring-2 focus:ring-brand"
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