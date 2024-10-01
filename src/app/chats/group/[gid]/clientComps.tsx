'use client'
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { AllChats, ChatAttributes, ChatSettings, Err, GroupMessageAttributes, MessageAttributes, NewChat, NewChatResponse, NewChatSettings } from '@/lib/types/type';
import Image from 'next/image';
import { Copy, Ellipsis, Reply, Send, Settings, TextQuote, Trash2, X } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRouter, useParams } from 'next/navigation';
import MessageTab from '../../MessageTab';
import { useDispatch, useSelector } from 'react-redux';
import { ConvoType, setConversations, updateConversation, setMessages, addMessages, deleteMessage } from '@/redux/chatSlice';
import { showChat } from '@/redux/navigationSlice';
import { RootState } from '@/redux/store';
import { useUser } from '@/hooks/useUser';
import { useSocket } from '@/app/providers';;

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
  const params = useParams<{ gid: string }>();
  const dispatch = useDispatch();
  const { userdata, loading, error, refetchUser } = useUser();
  const { messages , settings, conversations, loading: convoLoading } = useSelector<RootState, CHT>((state: RootState) => state.chat);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [quote,setQuote] = useState<QuoteProp>(initialQuoteState);
  const [isNew,setNew] = useState<boolean>(true);
  const [load,setLoading] = useState<boolean>();
  const [err,setError] = useState<boolean>();
  const [newMessage, setNewMessage] = useState('');
  const [group,setGroup] = useState<{[x: string]: any}>([]);
  const gid = params?.gid as string;
  const socket = useSocket();
  const convo = conversations?.find(c => c.id === gid) as ConvoType;
  const chat = settings?.[gid];
  const otherIds = convo?.participants?.filter(id => id !== userdata._id);
  const url = 'https://s3.amazonaws.com/profile-display-images/';
  const { chaT } = useSelector((state: RootState) => state.navigation);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastDate,setLastDate] = useState<string>();

  useEffect(() => {
    dispatch(showChat(''));
  }, [dispatch]);

  useEffect(() => {
    if (convo && convo.unread !== 0 && convoLoading === false) {
      // setUnreads(0);
      dispatch(updateConversation({ id: convo.id, updates: { unread: 0 } }));
    }
  }, [convo, convoLoading, dispatch, convo?.unread])
  
  const Messages = messages?.filter( msg => msg.chatId === gid ) as GroupMessageAttributes[];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
        setGroup(convo);
    } catch (error) {
      setError(true);
      console.error('Error setting data:', error);
    } finally {
      setLoading(false);
    }
  }, [convo]);

  useEffect(() => {
    if (!otherIds && !convo && !convoLoading) {
      console.log('Redirecting to /chats due to missing otherIds and convo');
      router.push('/chats');
    }
  }, [convo, convoLoading, otherIds, router]);

  useEffect(() => {
    fetchData()
  }, [fetchData, gid])

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

  useEffect(() => {
    if (socket && gid && userdata._id) {

      socket.on('groupAnnouncement', (data: string) => {
        // console.log('You have joined a group chat');
        // alert('You have joined a group chat');
      })
    }
  }, [otherIds, gid, socket, userdata._id]);

  const handleSendMessage = (id: string) => {
    if (newMessage.trim() !== '') {

      const textArea = textAreaRef.current;
      if (textArea) textArea.style.height = '40px';

      const isRead = otherIds
        ? Object.fromEntries([
            [userdata._id, false],
            ...otherIds.map((id: string) => [id, true])
          ])
        : { [userdata._id]: true };

      const msg = { 
        _id: generateObjectId(),
        chatId: gid, 
        sender: {
          id: userdata._id,
          name: userdata.name,
          displayPicture: userdata.dp,
          verified: userdata.verified,
        },
        receiverId: gid,
        content: newMessage, 
        timestamp: new Date().toISOString(),
        messageType: 'Groups',
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
    if (!socket || !gid) return;
    const details = { userId: userdata._id, to: otherIds, chatId: gid };
    socket.emit('typing', { userId: userdata._id, to: otherIds, chatId: gid });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { userId: userdata._id, to: otherIds, chatId: gid });
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
                <div className='truncate'>{group?.name}</div>
                {group?.verified && 
                  <Image src='/verified.svg' className='verified border-0' width={20} height={20} alt='Verified tag'/>
                }
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {convo?.online ? 'Online' : 'Offline'}
                {Object.entries(convo?.isTyping || {}).some(([id, isTyping]) => isTyping) && 
                  ` • ${Object.entries(convo?.isTyping || {})
                    ?.filter(([id, isTyping]) => isTyping)
                    .map(([id, _]) => group?.participants.find((p: { id: string }) => p.id === id)?.name || 'Someone')
                    .join(', ')} is typing...`}
              </p>
            </div>
          }
        </div>
        <Settings 
        className='text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]'
        onClick={() => router.push(`/chats/group/${params?.gid}/settings`)}
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
                    group?.groupDisplayPicture
                      ? url + group.groupDisplayPicture
                      : '/default.jpeg'
                  } 
                  className='displayPicture dark:border-slate-200 w-20 h-20 rounded-full object-cover' 
                  width={80} 
                  height={80} 
                  alt='Display Picture'
                />
                {/* {convo?.online && (
                  <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900"></div>
                )} */}
              </div>
            </>
          )}
          
          <div className='text-center'>
            <p className="flex items-center justify-center font-bold dark:text-slate-200 text-sm">
            {load
            ? <span className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1" />
            : (
                <>
                  {group?.name ? group.name : <span className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1" />}
                  {/* {group?.verified && 
                    <Image src='/verified.svg' className='verified border-0' width={20} height={20} alt='Verified tag'/>
                  } */}
                </>
              )
            }
            </p>
            {/* <p className="text-xs text-gray-500 dark:text-gray-400">{load || !group?.username ? <span className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1" /> : '@'+group.username }</p> */}
            <p className="text-xs text-gray-500 dark:text-gray-400">{load || !group?.description ? <span className="w-36 h-4 bg-gray-200 rounded animate-pulse mb-1" /> :  group.description}</p>
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
                  <div className={`flex m-1 ${message.sender.id === userdata._id ? "flex-row-reverse ml-auto" : "mr-auto"}`}>
                    <div className={`${message.sender.id === userdata._id ? "bg-gray-100 dark:bg-zinc-900" : "bg-brand"} border-white dark:text-white rounded-lg shadow-md text-xs p-2`}>
                      {Messages?.find(m => m._id as string === message.quotedMessage)?.content.substring(0, 40) || ''}
                    </div>
                  </div>
                )}
                <MessageTab key={message._id as string} chat='Groups' message={message} setQuote={setQuote}/>
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