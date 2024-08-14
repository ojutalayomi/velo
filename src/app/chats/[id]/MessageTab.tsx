'use client'
import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import { Copy, Ellipsis, Reply, Send, TextQuote, Trash2, X } from 'lucide-react';
// import { useUser } from '@/hooks/useUser'; 

type Message = {
  id: number,
  sender: string,
  text: string,
}

type Props = {
  message: Message,
  setQuote: React.Dispatch<React.SetStateAction<QuoteProp>>
}

type QuoteProp = {
  message: Message,
  state: boolean | undefined
}

const MessageTab = ({message,setQuote}:Props) => {
  const [isCopied, setIsCopied] = useState(false);
  const [options,openOptions] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);


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

      <div className={`flex flex-1 ${message.sender === "You" ? "flex-row-reverse ml-auto" : "mr-auto"} gap-2 items-center relative max-w-full`}>
        <div
          className={`mb-1 p-2 rounded-lg overflow-auto w-full flex ${
            message.sender === "You" ? "bg-brand rounded-br-none" : "bg-gray-100 rounded-bl-none dark:bg-zinc-900"
          } text-left`}
        >
          {/* <p className="dark:text-gray-100 font-semibold">{message.sender}</p> */}
          {/* <pre className={'dark:text-white'}>{message.text}</pre> */}
          <div className={'dark:text-white'}>{message.text}</div>
        </div>
        <Ellipsis ref={svgRef} size={20} className='cursor-pointer dark:text-gray-400' onClick={() => openOptions(true)}/>
        <div ref={optionsRef} className={`absolute backdrop-blur-sm ${options ? 'flex' : 'hidden'} ${message.sender === 'You' ? 'right-1/2' : 'left-1/2'} bg-white dark:bg-black flex-col gap-2 items-start p-2 rounded-md shadow-md top-1/2 min-w-[120px] z-[3]`}>
          <div className='flex gap-1 items-center cursor-pointer' 
          onClick={() => setQuote({
            message: {
            text: message.text,
            id: message.id,
            sender: message.sender
          }, state: true
          })}>
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

export default MessageTab;