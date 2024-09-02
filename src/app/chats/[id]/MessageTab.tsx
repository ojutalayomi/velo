'use client'
import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import { Copy, Ellipsis, Reply, Send, TextQuote, Trash2, X } from 'lucide-react';
import { AllChats, ChatAttributes, ChatSettings, Err, MessageAttributes, NewChat, NewChatResponse, NewChatSettings } from '@/lib/types/type';
import { useDispatch } from 'react-redux';
import { useUser } from '@/hooks/useUser';
import { ConvoType, setConversations, setMessages, addMessages, deleteMessage, updateLiveTime } from '@/redux/chatSlice'; 

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
  message: MessageAttributes,
  setQuote: React.Dispatch<React.SetStateAction<QuoteProp>>
}


const MessageTab = ({message,setQuote}:Props) => {
  const dispatch = useDispatch();
  const { userdata, loading, error, refetchUser } = useUser();
  const [isCopied, setIsCopied] = useState(false);
  const [options,openOptions] = useState<boolean>(false);
  const [time, setTime] = useState<string>(updateLiveTime('getlivetime', message.timestamp));
  const svgRef = useRef<SVGSVGElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
        setTime(updateLiveTime('getlivetime', message.timestamp));
    }, 10000);
    return () => clearInterval(interval); // This is important to clear the interval when the component unmounts
  }, [message.timestamp]);


  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node) && options) {
        openOptions(false);
      } else if (svgRef.current && !svgRef.current.contains(event.target as Node) && options) {
        openOptions(false);
      }
    };
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [options]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false),3000);
      openOptions(false);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };
  return(
    <div className={`dark:text-gray-400 flex flex-col mb-1`}>

      <div className={`flex flex-1 ${message.senderId === userdata._id ? "flex-row-reverse ml-auto" : "mr-auto"} gap-2 items-center relative max-w-full`}>
        <div
          className={`mb-1 p-2 rounded-lg overflow-auto w-full flex ${
            message.senderId === userdata._id ? "bg-brand rounded-br-none" : "bg-gray-100 rounded-bl-none dark:bg-zinc-900"
          } text-left`}
        >
          {/* <p className="dark:text-gray-100 font-semibold">{message.sender}</p> */}
          {/* <pre className={'dark:text-white'}>{message.text}</pre> */}
          <div className={'dark:text-white'}>{message.content}</div>
        </div>
        <Ellipsis ref={svgRef} size={20} className='cursor-pointer dark:text-gray-400' onClick={() => openOptions(true)}/>
        <div ref={optionsRef} className={`absolute backdrop-blur-sm ${options ? 'flex' : 'hidden'} ${message.senderId === userdata._id ? 'right-1/2' : 'left-1/2'} bg-white dark:bg-black flex-col gap-2 items-start p-2 rounded-md shadow-md top-1/2 min-w-[120px] z-[3]`}>
          <div className='flex gap-1 items-center cursor-pointer' 
          onClick={() => setQuote({
            message: {
            content: message.content,
            _id: message._id as string,
            senderId: message.senderId
            }, 
            state: true
          })}>
            <TextQuote size={20} className='dark:text-gray-400'/>
            <span className='text-xs dark:text-white'>Quote</span>
          </div>
          <div className='flex gap-1 items-center cursor-pointer' onClick={copyToClipboard}>
            <Copy size={20} className='dark:text-gray-400'/>
            <span className='text-xs dark:text-white'>{isCopied ? 'Copied!' : 'Copy message'}</span>
          </div>
          <div className='flex gap-1 items-center cursor-pointer' onClick={() => dispatch(deleteMessage(message._id))}>
            <Trash2 size={20} className='dark:text-gray-400'/>
            <span className='text-xs dark:text-white'>Delete</span>
          </div>
        </div>
      </div>

      <div className={`${message.senderId === userdata._id ? "text-right" : "text-left"} text-slate-600 text-sm`}>{time}</div>

    </div>
  )
}

export default MessageTab;