'use client'
import React, { Fragment, JSX, useCallback, useEffect, useRef, useState } from 'react';
import { AllChats, Attachment, ChatAttributes, ChatSettings, Err, GroupMessageAttributes, MessageAttributes, msgStatus, NewChat, NewChatResponse, NewChatSettings } from '@/lib/types/type';
import Image from 'next/image';
import { ChevronDown, Copy, Ellipsis, EllipsisVertical, Phone, Reply, Send, Settings, TextQuote, Trash2, Video, X } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRouter, useParams } from 'next/navigation';
import MessageTab from '../../MessageTab';
import { useDispatch, useSelector } from 'react-redux';
import { ConvoType, setConversations, updateConversation, setMessages, addMessage, deleteMessage, updateMessage } from '@/redux/chatSlice';
import { showChat } from '@/redux/navigationSlice';
import { RootState } from '@/redux/store';
import { useUser } from '@/hooks/useUser';
import { useSocket } from '@/app/providers';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import ChatTextarea from '../../ChatTextarea';

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
  const [quote,setQuote] = useState<QuoteProp>(initialQuoteState);
  const [isNew,setNew] = useState<boolean>(true);
  const [load,setLoading] = useState<boolean>();
  const [err,setError] = useState<boolean>();
  const [newMessage, setNewMessage] = useState('');
  const [group,setGroup] = useState<{[x: string]: any}>([]);
  const gid = params?.gid as string;
  const socket = useSocket();
  const convo = conversations?.find(c => c.id === gid) as ConvoType;
  const [isPinned, setIsPinned] = useState(convo?.pinned);
  const [isDeleted, setIsDeleted] = useState(convo?.deleted);
  const [isArchived, setIsArchived] = useState(convo?.archived);
  const [searchBarOpen, openSearchBar] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  // const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setSearchQuery(e.target.value);
  // };
  const chat = settings?.[gid];
  const otherIds = convo?.participants?.filter(id => id !== userdata._id);
  const url = 'https://s3.amazonaws.com/profile-display-images/';
  const { chaT } = useSelector((state: RootState) => state.navigation);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  let lastDateRef = useRef<string>('');
  const messageBoxRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([])

  useEffect(() => {
    dispatch(showChat(''));
  }, [dispatch]);

  useEffect(() => {
    if (convo && convo.unread !== 0 && !convoLoading && socket) {
      // setUnreads(0);
      socket.emit('updateConversation',{ id: convo.id, updates: { unreadCount: 0, userId: userdata._id } })
      dispatch(updateConversation({ id: convo.id, updates: { unread: 0 } }));
      dispatch(updateMessage({
        updates: {
          status: 'delivered' as msgStatus,
        }
      }));
    }
  }, [convo, convoLoading, dispatch, convo?.unread, socket, userdata._id])
  
  const Messages = messages?.filter( msg => {
    const sender = 'sender' in msg ? msg.sender.name : '';
    return msg.chatId === gid && (msg.content.toLowerCase().includes(searchQuery.toLowerCase()) || sender.toLowerCase().includes(searchQuery.toLowerCase()))
  })  as GroupMessageAttributes[];

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
    if (socket && gid && userdata._id) {

      socket.on('groupAnnouncement', (data: string) => {
        // console.log('You have joined a group chat');
        // alert('You have joined a group chat');
      })
    }
  }, [otherIds, gid, socket, userdata._id]);

  const handleSendMessage = async (id: string) => {
    try {
      if (newMessage.trim() === '') {
        return; // Don't send empty messages or messages without attachments
      }

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
        attachments: [] as Attachment[],
        quotedMessage: id,
        status: 'sending' as msgStatus,
      }

        // Read and process all files
        const fileReadPromises = attachments.map((file) => {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const fileData = reader.result as ArrayBuffer;
            msg.attachments.push({
              name: file.name,
              type: file.type,
              data: Array.from(new Uint8Array(fileData)), // Convert ArrayBuffer to array
            });
            resolve();
          };
          reader.onerror = () => {
            reject(new Error(`Failed to read file: ${file.name}`));
          };
          reader.readAsArrayBuffer(file);
        });
      });
  
      // Wait for all files to be read
      await Promise.all(fileReadPromises);

      
      dispatch(addMessage(msg as unknown as MessageAttributes));
      dispatch(updateConversation({
        id: msg._id,
        updates: {
          unread: msg.isRead[userdata._id] ? convo.unread : (convo.unread ?? 0) + 1,
          lastMessage: msg.content,
          lastUpdated: msg.timestamp
        }
      }));

      if (msg && socket) {
        socket.emit('chatMessage', msg)
      }
      setNewMessage('');
      setAttachments([]);
      closeQuote();
      
      setTimeout(() => {
        scrollToBottom();
      }, 1000)
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
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

  const options = [
    { id: 1, name: 'View contact', action: () => console.log('Pinned') },
    { id: 2, name: 'Search', action: () => openSearchBar(true) },
    { id: 3, name: 'Mute notifications', action: () => console.log('Archived') },
    { id: 4, name: 'Wallpaper', action: () => console.log('Hidden') },
    { id: 5, name: 'Delete', action: () => console.log('Unread') },
    { id: 6, name: 'Report', action: () => console.log('Blocked') },
    { id: 7, name: !convo?.pinned ? 'Pin' : 'Unpin', action: () => {
      dispatch(updateConversation({ id: gid, updates: { pinned: !convo?.pinned } }));
    } },
    { id: 9, name: convo?.archived ?'Unarchive' : 'Archive', action: () => dispatch(updateConversation({ id: gid, updates: { archived: !convo?.archived } })) },
    { id: 10, name: 'Leave group', action: () => console.log('left group') }
  ];

  useEffect(() => {
    if (messageBoxRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messageBoxRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      // Only auto-scroll if user was already at the bottom
      if (!isNearBottom && !isScrolled) {
        scrollToBottom();
        setIsScrolled(true);
      }
    }
  }, [Messages, isScrolled]);

  const handleScroll = () => {
    if (messageBoxRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messageBoxRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
      setShowScrollButton(isNearBottom);
    }
  };

  const scrollToBottom = () => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTo({
        top: messageBoxRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={`bg-bgLight tablets1:flex ${chaT} dark:bg-bgDark shadow-md flex flex-col min-h-screen max-h-screen flex-1 rounded-lg overflow-hidden mobile:absolute tablets1:w-auto h-full w-full z-10 tablets1:z-[unset]`}>
      <div className="bg-gray-100 dark:bg-zinc-900 dark:text-slate-200 flex gap-4 items-center justify-between px-3 py-2 sticky top-0 z-10">
        {!searchBarOpen ?
        <>
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
          <div className='flex items-center gap-2'>
            <Phone
            className='text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]'
            onClick={() => console.log(`audio call`)}
            />
            <Video 
            className='text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]'
            onClick={() => router.push(`/call/?id=${gid}`)}
            />
            <Popover>
              <PopoverTrigger>
                <EllipsisVertical 
                  className='text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]'
                />
              </PopoverTrigger>
              <PopoverContent className='bg-white dark:bg-zinc-800 max-w-52 mt-2 mr-2 p-0 rounded-md shadow-lg z-10'>
                <ul className="py-1">
                  {options.map((option) => (
                  <li key={option.id} 
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if(socket){
                        option.action();
                        switch (true) {
                          case option.name.toLowerCase().includes("pin"):
                            socket.emit('updateConversation', { 
                              id: gid, 
                              updates: { pinned: !isPinned, userId: userdata._id } 
                            });
                            break;
                          case option.name.toLowerCase().includes("archive"):
                            socket.emit('updateConversation', { 
                              id: gid, 
                              updates: { archived: !isArchived, userId: userdata._id } 
                            });
                            break;
                          default:
                            break;
                        }
                      }
                    }}
                  >
                    {option.name}
                  </li>
                ))}
                </ul>
              </PopoverContent>
            </Popover>
          </div>
        </> :
        <div className="flex items-center gap-2 w-full">
          <FontAwesomeIcon onClick={() => openSearchBar(false)} icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
          <Input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search" className="rounded-full" />
          <button onClick={() => setSearchQuery('')} className={`${searchQuery === '' && 'hidden '} text-brand hover:text-brand/70 font-bold py-2`}>
            Clear
          </button>
        </div>
        }
      </div>

      <div ref={messageBoxRef} onScroll={handleScroll} className="pb-12 overflow-y-auto pt-4 px-2 flex flex-col flex-1 scroll-pt-20"> 
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
        <div className="mt-4 flex-1">
        {Messages?.reduce((acc: JSX.Element[], message, index) => {
            const messageDate = new Date(message.timestamp).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

            acc.push(
              <Fragment key={message._id as string}>
                {index === 0 || messageDate !== lastDateRef.current ? (
                  <div key={`date-${messageDate}`} data-date={messageDate} className="text-center my-2 sticky top-0 z-[1]">
                    <span className='bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full text-xs shadow-sm'>{messageDate}</span>
                  </div>
                ) : null}
                
                <MessageTab key={message._id as string} chat='Groups' message={message} setQuote={setQuote}/>
              </Fragment>
            );
            lastDateRef.current = messageDate;

            return acc;
          }, [])}
        </div>

        <div className={`absolute rounded-full right-0 bottom-16 shadow-lg mr-4 p-2 bg-gray-100 dark:bg-zinc-900 dark:text-slate-200 flex items-center gap-2 ${showScrollButton ? 'opacity-0' : 'opacity-100'}`}>
          <ChevronDown
          className='text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out'
          onClick={scrollToBottom}
          />
        </div> 
      </div>

      <ChatTextarea quote={quote} newMessage={newMessage} setNewMessage={setNewMessage} handleSendMessage={handleSendMessage} handleTyping={handleTyping} closeQuote={closeQuote} setAttachments={setAttachments}/>
      {children}
    </div>
  );
};

export default ChatPage;