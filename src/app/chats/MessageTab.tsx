'use client'
import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, CheckCheck, Copy, Ellipsis, Loader, Reply, Send, TextQuote, Trash2, X, SmilePlus } from 'lucide-react';
import { AllChats, ChatAttributes, ChatSettings, Err, GroupMessageAttributes, MessageAttributes, NewChat, NewChatResponse, NewChatSettings } from '@/lib/types/type';
import { useDispatch, useSelector } from 'react-redux';
import { useUser } from '@/hooks/useUser';
import { updateMessageReactions, deleteMessage, updateLiveTime, updateConversation, editMessage } from '@/redux/chatSlice'; 
import { useSocket } from '../providers';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { RootState } from '@/redux/store';
import { LinkPreview } from '@/components/LinkPreview';

type Message = {
  _id: string,
  senderId: string,
  content: string,
}

type QuoteProp = {
  message: Message,
  state: boolean | undefined
}

type Props = {
  message: MessageAttributes | GroupMessageAttributes,
  setQuote: React.Dispatch<React.SetStateAction<QuoteProp>>,
  chat?: string,
}

// Define the type for each option
type Option = {
  icon: React.ElementType; // Type for the icon component
  text: string; // Text to display
  onClick: () => void; // Click handler function
};

const renderTextWithLinks = (text: string) => {
  // Regex for matching URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Split text into parts (links and non-links)
  const parts = text.split(urlRegex);
  
  // Find all links in the text
  const links = text.match(urlRegex) || [''];
  
  // Merge parts and links back together with proper rendering
  return parts.map((part, i) => {
    if (links.includes(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const MessageTab = ({ message, setQuote, chat = "DMs"}:Props) => {
  const dispatch = useDispatch();
  const { userdata } = useUser();
  const [open, setOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [options,openOptions] = useState<boolean>(false);
  const [messageContent,setMessageContent] = useState<string>(message.content.replace('≤≤≤',''));
  const [time, setTime] = useState<string>(updateLiveTime('chat-time', message.timestamp));
  const socket = useSocket();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_LENGTH = 300; // Adjust this number to change when the "Read more" appears

  const senderId = 'sender' in message ? message.sender.id : message.senderId;
  const sender = 'sender' in message ? message.sender.name : '';
  const verified = 'sender' in message ? message.sender.verified : false;
  const displayPicture = 'sender' in message ? message.sender.displayPicture : '';
  const url = 'https://s3.amazonaws.com/profile-display-images/';

  useEffect(() => {
    setMessageContent(message.content.replace('≤≤≤',''));
  }, [message.content]);

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <Loader size={15} className='animate-spin'/>;
      case 'sent':
        return <Check size={15}/>;
      case 'delivered':
        return <CheckCheck size={15} className='dark:text-gray-400'/>;
      case 'failed':
        return <b className='text-red-800'>Not sent!</b>;
      default:
        return <CheckCheck size={15} className='text-green-500'/>;
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (options && !(event.target as Element).closest('.edit-list')) {
        // console.log('Clicked outside options');
        openOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [options]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false),3000);
      openOptions(false);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Update the optionss array to use the defined type
  const optionss: Option[] = [
    {
      icon: TextQuote,
      text: 'Quote',
      onClick: () => setQuote({
        message: { content: messageContent, _id: message._id as string, senderId },
        state: true
      })
    },
    {
      icon: Copy,
      text: isCopied ? 'Copied!' : 'Copy message',
      onClick: copyToClipboard
    },
    ...(senderId === userdata._id ? [{
      icon: Trash2,
      text: 'Delete',
      onClick: () => {
        if(!message.content.endsWith('≤≤≤')){
          if(socket){
            dispatch(updateConversation({ id: message.chatId as string, updates: { lastMessage: 'This message was deleted' } }));
            dispatch(editMessage({id: message._id as string, content: 'You deleted this message.≤≤≤'}))
            openOptions(false);
            socket.emit('updateConversation',{ id: message._id, updates: { deleted: true } })
          }
        } else {
          dispatch(deleteMessage(message._id as string));
        }
      }
    }] : [])
  ];

  const onEmojiClick = (emojiObject: any) => {
    if (message._id) {
      dispatch(updateMessageReactions({id: message._id as string, updates: {...message.reactions, [emojiObject]: {emoji: emojiObject, users: [userdata._id]}}}));
      setShowEmojiPicker(false);
    }
  };

  const extractUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [''];
  };
  
  const urls = extractUrls(messageContent);
  const firstUrl = urls[0]; // Only show preview for the first URL


  if (chat === "Groups") {
    return (
      <>
        <div id={message._id as string} className={`${senderId === userdata._id ? "items-end" : "items-start"} dark:text-gray-400 flex flex-col mb-4 transition-colors duration-300`}>

          <div className={`flex flex-1 ${senderId === userdata._id ? "flex-row-reverse ml-auto" : "mr-auto"} gap-3 items-start relative max-w-full`}>
            {/* Avatar for other users */}
            {senderId !== userdata._id && (
              <Image 
                src={displayPicture ? (displayPicture.includes('ila-') ? '/default.jpeg' : url + displayPicture) : '/default.jpeg'}
                height={32} 
                width={32} 
                alt={sender} 
                className="rounded-full mt-1" 
              />
            )}

            <div className="flex flex-col gap-1 max-w-[85%]">
              {/* Quote and Link Preview */}
              {message.quotedMessage && <Quote message={message} senderId={senderId}/>}
              {firstUrl && <LinkPreview url={firstUrl} />}

              {/* Message bubble */}
              <div
                className={`relative p-3 rounded-lg ${
                  senderId === userdata._id 
                    ? "bg-brand text-white rounded-tr-none" 
                    : "bg-gray-100 dark:bg-zinc-800 rounded-tl-none"
                }`}
                onTouchStart={(event) => {
                  if (event.touches.length === 1) {
                    const longPressTimer = setTimeout(() => setOpen(true), 500);
                    const cancelLongPress = () => clearTimeout(longPressTimer);
                    document.addEventListener('touchend', cancelLongPress);
                    document.addEventListener('touchmove', cancelLongPress);
                    return () => {
                      document.removeEventListener('touchend', cancelLongPress);
                      document.removeEventListener('touchmove', cancelLongPress);
                    };
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setOpen(true);
                }}
              >
                {/* Sender name for other users */}
                {senderId !== userdata._id && (
                  <div className='flex items-center justify-between gap-1'>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{sender}</span>
                      {verified && <Image src='/verified.svg' width={16} height={16} alt='Verified' className="verified"/>}
                    </div>
                    <Options options={optionss} open={open} setOpen={setOpen}/>
                  </div>
                )}
                
                <p className="text-sm whitespace-pre-wrap break-words">
                  {messageContent.length > MAX_LENGTH && !isExpanded
                    ? renderTextWithLinks(messageContent.slice(0, MAX_LENGTH) + "...")
                    : renderTextWithLinks(messageContent)}
                </p>
                
                {messageContent.length > MAX_LENGTH && (
                  <Button
                    variant="link"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`text-sm mt-1 ${
                      senderId === userdata._id ? 'text-gray-200' : 'text-gray-500'
                    } hover:underline`}
                  >
                    {isExpanded ? 'Read less' : 'Read more'}
                  </Button>
                )}

                {/* Time and status */}
                <div className={`flex items-center gap-2 text-xs text-nowrap ${
                  senderId === userdata._id ? "justify-end" : "justify-start"
                }`}>
                  {time}
                  {senderId === userdata._id && renderStatusIcon(message.status)}
                </div>
              </div>

              {/* Reactions */}
              <div className={`${senderId === userdata._id ? "flex-row-reverse ml-auto" : "mr-auto"} mt-1 flex items-center gap-1`}>
                <EmojiPicker onChange={onEmojiClick} />
                {senderId === userdata._id && (<Options options={optionss} open={open} setOpen={setOpen}/>)}
                {Object.keys(message.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(message.reactions)
                      .slice(0, 5)
                      .map(([emoji, users], index) => {
                        const userArray = users as unknown as string[];
                        return (
                          <span 
                            key={index} 
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              senderId === userdata._id 
                                ? 'bg-white/10' 
                                : 'bg-gray-200 dark:bg-zinc-700'
                            }`}
                            title={`${userArray.length} ${userArray.length === 1 ? 'reaction' : 'reactions'}`}
                          >
                            {emoji}{userArray.length > 1 && <span className="ml-1">{userArray.length}</span>}
                          </span>
                        );
                      })}
                    {Object.keys(message.reactions).length > 5 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        senderId === userdata._id 
                          ? 'bg-white/10' 
                          : 'bg-gray-200 dark:bg-zinc-700'
                      }`}>
                        +{Object.keys(message.reactions).length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </>
    )
  }

  return(
    <>
      <div id={message._id as string} className={`${senderId === userdata._id ? "items-end" : "items-start"} dark:text-gray-400 flex flex-col mb-2 transition-colors duration-300`}>
        {/* Quote and Link Preview */}
        {message.quotedMessage && <Quote message={message} senderId={senderId}/>}

        {/* Main Message Container */}
        <div className={`flex flex-1 ${senderId === userdata._id ? "flex-row-reverse ml-auto" : "mr-auto"} gap-2 items-center relative max-w-full`}>

          <div className="flex flex-col gap-1 max-w-[85%]">
            {firstUrl && <LinkPreview url={firstUrl} />}

            {/* Message Bubble */}
            <div
              className={`relative mb-1 p-3 rounded-2xl overflow-auto w-full flex flex-col shadow-sm ${
                senderId === userdata._id 
                  ? "bg-brand rounded-br-none text-white" 
                  : "bg-gray-50 rounded-bl-none dark:bg-zinc-800/80 dark:text-white"
              } text-left`}
              onTouchStart={(event) => {
                if (event.touches.length === 1) {
                  const touch = event.touches[0];
                  const longPressTimer = setTimeout(() => {
                    setOpen(true);
                  }, 500);
                  
                  const cancelLongPress = () => {
                    clearTimeout(longPressTimer);
                  };

                  document.addEventListener('touchend', cancelLongPress);
                  document.addEventListener('touchmove', cancelLongPress);

                  return () => {
                    document.removeEventListener('touchend', cancelLongPress);
                    document.removeEventListener('touchmove', cancelLongPress);
                  };
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setOpen(true);
              }}
            >
              {/* Message Content */}
              <div className="">
                <p className="text-sm whitespace-pre-wrap break-words" style={{ fontFamily: 'inherit' }}>
                  {messageContent.length > MAX_LENGTH && !isExpanded
                    ? renderTextWithLinks(messageContent.slice(0, MAX_LENGTH) + "...")
                    : renderTextWithLinks(messageContent)}
                </p>
                {messageContent.length > MAX_LENGTH && (
                  <Button
                    variant="link"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`text-sm mt-1 ${
                      senderId === userdata._id ? 'text-gray-200' : 'text-gray-500'
                    } hover:underline`}
                  >
                    {isExpanded ? 'Read less' : 'Read more'}
                  </Button>
                )}
              </div>
              <div className={`${senderId === userdata._id ? "text-right justify-end" : "text-left justify-start"} text-nowrap flex items-center gap-2 text-xs mt-1`}>
                <div className='dark:after:text-slate-200 after:content-[ • ]'>{time}</div>
                {senderId === userdata._id && renderStatusIcon(message.status)}
              </div>

            </div>
          </div>

          {/* Message Options */}
          <Options options={optionss} open={open} setOpen={setOpen}/>
        </div>

        {/* Message Footer */}
        {/* Reactions */}
        <div className='mt-1 flex items-center gap-1'>
          <EmojiPicker onChange={onEmojiClick} />
          {Object.entries(message.reactions)
            .slice(0, 5)
            .map(([emoji, users], index) => {
              const userArray = users as unknown as string[];
              return (
                <span 
                  key={index} 
                  className={`px-2 py-1 rounded-full text-xs shadow-sm ${
                    senderId === userdata._id 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'bg-white dark:bg-zinc-700'
                  }`}
                  title={`${userArray.length} ${userArray.length === 1 ? 'reaction' : 'reactions'}`}
                >
                  {emoji}{userArray.length > 1 && <span className="ml-1 text-[10px]">{userArray.length}</span>}
                </span>
              );
            })}
          {Object.keys(message.reactions).length > 5 && (
            <span 
              className={`px-2 py-1 rounded-full text-xs shadow-sm ${
                senderId === userdata._id 
                  ? 'bg-white/20 backdrop-blur-sm' 
                  : 'bg-white dark:bg-zinc-700'
              }`}
            >
              +{Object.keys(message.reactions).length - 5}
            </span>
          )}
        </div>

      </div>
    </>
  )
}

export default MessageTab;

const Quote = ({message, senderId}:{message: MessageAttributes | GroupMessageAttributes, senderId: string}) => {
  const { userdata } = useUser();
  const messages = useSelector((state: RootState) => state.chat.messages);
  
  const Messages = messages?.filter( msg => {
    const sender = 'sender' in msg ? msg.sender.name : '';
    return msg.chatId === message.chatId
  })  as GroupMessageAttributes[];

  const quotedMessage = Messages?.find(m => m._id as string === message.quotedMessage);

  const handleQuoteClick = () => {
    const messageElement = document.getElementById(message.quotedMessage as string);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth' });
      // Add a brief highlight effect
      messageElement.classList.add('bg-brand/20');
      messageElement.classList.add('rounded-lg');
      setTimeout(() => {
        messageElement.classList.remove('bg-brand/20');
        messageElement.classList.remove('rounded-lg');
      }, 2000);
    }
  };

  return (
    <div 
      className={`flex m-1 ${senderId === userdata._id ? "flex-row-reverse ml-auto" : "mr-auto"}`}
      onClick={handleQuoteClick}
    >
      <div className={`${senderId === userdata._id ? "bg-gray-100 dark:bg-zinc-900" : "bg-brand"} border-white dark:text-white rounded-lg shadow-md text-xs p-2 cursor-pointer hover:opacity-80 transition-opacity`}>
        {renderTextWithLinks(quotedMessage?.content.substring(0, 40) || '')}
      </div>
    </div>
  )
}

function Options({options, open, setOpen}:{options: Option[], open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>>}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Handle mobile drawer
  const handleDrawerChange = (open: boolean) => {
    setIsDrawerOpen(open);
    setOpen(open);
  };

  // Handle desktop popover
  const handlePopoverChange = (open: boolean) => {
    setIsPopoverOpen(open);
    setOpen(open);
  };

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer open={open} onOpenChange={handleDrawerChange}>
        <DrawerTrigger asChild>
          <button 
            type="button"
            className='tablets:hidden'
            aria-label="Open message options"
          >
            <Ellipsis size={20} className='cursor-pointer dark:text-gray-400' />
          </button>
        </DrawerTrigger>
        <DrawerContent className='tablets:hidden'>
          <DrawerHeader>
            <DrawerTitle>Message Options</DrawerTitle>
          </DrawerHeader>
          <div className="px-4">
            {options.map(({ icon: Icon, text, onClick }, index) => (
              <button
                key={index}
                type="button"
                className='flex w-full items-center gap-3 py-3 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded px-2'
                onClick={() => {
                  onClick();
                  handleDrawerChange(false);
                }}
              >
                <Icon size={20} className='dark:text-gray-400'/>
                <span className='text-base dark:text-white'>{text}</span>
              </button>
            ))}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Desktop Popover */}
      <Popover open={open} onOpenChange={handlePopoverChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className='hidden tablets:block'
            aria-label="Open message options"
          >
            <Ellipsis size={20} className='cursor-pointer dark:text-gray-400' />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className='bg-white dark:bg-zinc-800 hidden tablets:block min-w-[160px] p-1 rounded-md shadow-lg w-auto'
          align="end"
          sideOffset={5}
        >
          <div className="flex flex-col">
            {options.map(({ icon: Icon, text, onClick }, index) => (
              <button
                key={index}
                type="button"
                className='flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded'
                onClick={() => {
                  onClick();
                  handlePopoverChange(false);
                }}
              >
                <Icon size={16} className='dark:text-gray-400'/>
                <span className='text-sm dark:text-white'>{text}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}