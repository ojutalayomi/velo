'use client'
import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, CheckCheck, Copy, Ellipsis, Loader, Reply, Send, TextQuote, Trash2, X } from 'lucide-react';
import { AllChats, ChatAttributes, ChatSettings, Err, GroupMessageAttributes, MessageAttributes, NewChat, NewChatResponse, NewChatSettings } from '@/lib/types/type';
import { useDispatch } from 'react-redux';
import { useUser } from '@/hooks/useUser';
import { ConvoType, setConversations, setMessages, addMessage, deleteMessage, updateLiveTime, updateConversation, editMessage } from '@/redux/chatSlice'; 
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

const MessageTab = ({ message, setQuote, chat = "DMs"}:Props) => {
  const dispatch = useDispatch();
  const { userdata, loading, error, refetchUser } = useUser();
  const [open, setOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [options,openOptions] = useState<boolean>(false);
  const [messageContent,setMessageContent] = useState<string>(message.content.replace('≤≤≤',''));
  const [time, setTime] = useState<string>(updateLiveTime('chat-time', message.timestamp));
  const socket = useSocket();
  const svgRef = useRef<SVGSVGElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

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
        return <Loader size={10} className='dark:text-gray-400 animate-spin dark:after:text-slate-200 after:content-[ • ]'/>;
      case 'sent':
        return <Check size={10} className='dark:text-gray-400 dark:after:text-slate-200 after:content-[ • ]'/>;
      case 'delivered':
        return <CheckCheck size={10} className='dark:text-gray-400 dark:after:text-slate-200 after:content-[ • ]'/>;
      case 'failed':
        return <b className='text-red-800 dark:after:text-slate-200 after:content-[ • ]'>Not sent!</b>;
      default:
        return <CheckCheck size={10} className='text-brand dark:after:text-slate-200 after:content-[ • ]'/>;
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

  if (chat === "Groups") {
    return (
      <div className={`dark:text-gray-400 flex flex-col mb-2`}>
        <div className={`flex flex-1 ${senderId === userdata._id ? "flex-row-reverse ml-auto" : "mr-auto"} gap-2 items-center relative max-w-full`}>
          <div
            className={`mb-1 p-2 rounded-lg overflow-auto w-full flex flex-col shadow-md ${
              senderId === userdata._id ? "bg-brand rounded-br-none" : "bg-gray-100 rounded-bl-none dark:bg-zinc-900"
            } text-left`}
            onTouchStart={(event) => {
              if (event.touches.length === 1) {
                const touch = event.touches[0];
                const longPressTimer = setTimeout(() => {
                  setOpen(true);
                }, 500); // 500ms long press
                
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
            {senderId !== userdata._id && (
              <div className='flex items-center'>
                <Image src={
                  displayPicture  
                  ?  (
                    displayPicture.includes('ila-') 
                    ? '/default.jpeg'
                    : url +  displayPicture
                  )
                  : '/default.jpeg'} 
                  height={10} width={10} alt={sender} className="w-4 h-4 rounded-full mr-1" 
                />
                <p className="dark:text-gray-100 font-semibold text-xs mb-1">{sender}</p>
                {verified && 
                  <Image src='/verified.svg' className='verified border-0' width={20} height={20} alt='Verified tag'/>
                }
              </div>
            )}
            <p className={`dark:text-white mobile:text-sm whitespace-pre-wrap`} style={{ fontFamily: 'inherit', }}>{messageContent}</p>
          </div>
          <Options options={optionss} open={open} setOpen={setOpen}/>
        </div>
        <div className={`${senderId === userdata._id ? "text-right justify-end" : "text-left justify-start"} flex items-center gap-1 text-slate-600 mt-[-5px] mobile:text-xs text-sm`}>
        {senderId === userdata._id && renderStatusIcon(message.status)}{time}
        </div>
      </div>
    )
  }

  return(
    <div className={`dark:text-gray-400 flex flex-col mb-2`}>

      <div className={`flex flex-1 ${senderId === userdata._id ? "flex-row-reverse ml-auto" : "mr-auto"} gap-2 items-center relative max-w-full`}>
        <div
          className={`mb-1 p-2 rounded-lg overflow-auto w-full flex flex-col shadow-md ${
            senderId === userdata._id ? "bg-brand rounded-br-none" : "bg-gray-100 rounded-bl-none dark:bg-zinc-900"
          } text-left`}
          onTouchStart={(event) => {
            if (event.touches.length === 1) {
              const touch = event.touches[0];
              const longPressTimer = setTimeout(() => {
                setOpen(true);
              }, 500); // 500ms long press
              
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
          {/* <p className="dark:text-gray-100 font-semibold">{message.sender}</p> */}
          {/* <pre className={'dark:text-white'}>{message.text}</pre> */}
          <p className={`dark:text-white mobile:text-sm whitespace-pre-wrap`} style={{ fontFamily: 'inherit', }}>{messageContent}</p>
        </div>
        <Options options={optionss} open={open} setOpen={setOpen}/>
      </div>

      <div className={`${senderId === userdata._id ? "text-right justify-end" : "text-left justify-start"} flex items-center gap-1 text-slate-600 mt-[-5px] mobile:text-xs text-sm`}>
        {senderId === userdata._id && renderStatusIcon(message.status)}{time}
      </div>

    </div>
  )
}

export default MessageTab;

export function Options({options, open, setOpen}:{options: Option[], open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>>}) {

  return (
    <>
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
      <Ellipsis size={20} className='cursor-pointer dark:text-gray-400 hidden' onClick={() => setOpen(true)}/>
      </DrawerTrigger>
      <DrawerContent className='tablets:hidden'>
        <DrawerHeader className="text-left">
          <DrawerTitle className='hidden '>Options</DrawerTitle>
          <DrawerDescription className='flex flex-col gap-2'>
            {options.map(({ icon: Icon, text, onClick }, index) => (
              <div key={index} className='flex gap-1 items-center cursor-pointer' onClick={onClick}>
                <Icon size={25} className='dark:text-gray-400'/>
                <span className='text-lg dark:text-white'>{text}</span>
              </div>
            ))}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>

    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Ellipsis size={20} className='cursor-pointer dark:text-gray-400 mobile:hidden' onClick={() => setOpen(true)}/>
      </PopoverTrigger>
      <PopoverContent className='bg-white mobile:hidden dark:bg-zinc-800 w-auto space-y-2 mt-2 mr-2 p-2 rounded-md shadow-lg z-10'>
        {options.map(({ icon: Icon, text, onClick }, index) => (
          <div key={index} className='flex gap-1 items-center cursor-pointer' onClick={onClick}>
            <Icon size={20} className='dark:text-gray-400'/>
            <span className='dark:text-white text-sm'>{text}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
    </>
  )
}