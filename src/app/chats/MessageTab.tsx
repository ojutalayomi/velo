'use client'
import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, CheckCheck, Copy, Ellipsis, Loader, Reply, Send, TextQuote, Trash2, X } from 'lucide-react';
import { AllChats, ChatAttributes, ChatSettings, Err, GroupMessageAttributes, MessageAttributes, NewChat, NewChatResponse, NewChatSettings } from '@/lib/types/type';
import { useDispatch } from 'react-redux';
import { useUser } from '@/hooks/useUser';
import { ConvoType, setConversations, setMessages, addMessage, deleteMessage, updateLiveTime, updateConversation, editMessage } from '@/redux/chatSlice'; 
import { useSocket } from '../providers';

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


const MessageTab = ({ message, setQuote, chat = "DMs"}:Props) => {
  const dispatch = useDispatch();
  const { userdata, loading, error, refetchUser } = useUser();
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
        return <Loader size={10} className='dark:text-gray-400 animate-spin'/>;
      case 'sent':
        return <Check size={10} className='dark:text-gray-400'/>;
      case 'delivered':
        return <CheckCheck size={10} className='dark:text-gray-400'/>;
      case 'failed':
        return <b className='text-red-800'>Not sent!</b>;
      default:
        return <Check size={10} className='dark:text-gray-400'/>;
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

  const optionss = [
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
                  openOptions(true);
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
            <pre className={`dark:text-white mobile:text-sm break-words whitespace-pre-wrap`} style={{ fontFamily: 'inherit', }}>{messageContent}</pre>
          </div>
          <Ellipsis ref={svgRef} size={20} className='cursor-pointer dark:text-gray-400 mobile:hidden' onClick={() => openOptions(true)}/>
          {options && (
            <div className={`edit-list absolute backdrop-blur-sm flex ${senderId === userdata._id ? 'right-1/2' : 'left-1/2'} bg-white dark:bg-black flex-col gap-2 items-start p-2 rounded-md shadow-md top-1/2 min-w-[120px] z-[3]`} 
            onClick={(e) => e.stopPropagation()}
            >
              {optionss.map(({ icon: Icon, text, onClick }, index) => (
                <div key={index} className='flex gap-1 items-center cursor-pointer' 
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick()
                  }}
                >
                  <Icon size={20} className='dark:text-gray-400'/>
                  <span className='text-xs dark:text-white'>{text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={`${senderId === userdata._id ? "text-right justify-end" : "text-left justify-start"} flex items-center gap-1 text-slate-600 mt-[-5px] mobile:text-xs text-sm`}>
        {renderStatusIcon(message.status)} • {time}
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
                openOptions(true);
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
        >
          {/* <p className="dark:text-gray-100 font-semibold">{message.sender}</p> */}
          {/* <pre className={'dark:text-white'}>{message.text}</pre> */}
          <pre className={`dark:text-white mobile:text-sm break-words whitespace-pre-wrap`} style={{ fontFamily: 'inherit', }}>{messageContent}</pre>
        </div>
        <Ellipsis ref={svgRef} size={20} className='cursor-pointer dark:text-gray-400 mobile:hidden' onClick={() => openOptions(true)}/>
        <div ref={optionsRef} className={`edit-list absolute backdrop-blur-sm ${options ? 'flex' : 'hidden'} ${senderId === userdata._id ? 'right-1/2' : 'left-1/2'} bg-white dark:bg-black flex-col gap-2 items-start p-2 rounded-md shadow-md top-1/2 min-w-[120px] z-[3]`}
        onClick={(e) => e.stopPropagation()}
        >
          {optionss.map(({ icon: Icon, text, onClick }, index) => (
            <div key={index} className='flex gap-1 items-center cursor-pointer' onClick={onClick}>
              <Icon size={20} className='dark:text-gray-400'/>
              <span className='text-xs dark:text-white'>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${senderId === userdata._id ? "text-right justify-end" : "text-left justify-start"} flex items-center gap-1 text-slate-600 mt-[-5px] mobile:text-xs text-sm`}>
        {renderStatusIcon(message.status)} • {time}
      </div>

    </div>
  )
}

export default MessageTab;