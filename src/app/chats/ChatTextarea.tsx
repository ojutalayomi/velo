import { Textarea } from "@/components/ui/textarea";
import { X, Send, Smile } from "lucide-react";
import { useEffect, useRef } from "react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
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

interface ChatTextareaProps {
    quote: QuoteProp;
    newMessage: string;
    setNewMessage: React.Dispatch<React.SetStateAction<string>>;
    handleSendMessage: (messageId: string) => void;
    handleTyping: () => void;
    closeQuote: () => void;
}

const ChatTextarea = ({quote, newMessage, setNewMessage,  handleSendMessage, handleTyping, closeQuote}: ChatTextareaProps) => {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const handleInput = () => {
            const textArea = textAreaRef.current;
            if (textArea) {
                textArea.style.height = '40px';
                textArea.style.height = `${textArea.scrollHeight === 41 ? 40 : textArea.scrollHeight}px`;
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
        const textArea = textAreaRef.current;
        if (textArea && !newMessage) {
            textArea.style.height = '40px';
        }
    }, [newMessage]);

    const handleQuoteClick = () => {
        const messageElement = document.getElementById(quote.message?._id as string);
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

    const extractUrls = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.match(urlRegex) || [];
    };

    const urls = extractUrls(newMessage);
    const firstUrl = urls[0];

    return (
        <div className="px-4 py-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-t dark:border-zinc-800 z-10">
            {quote.state && (
                <div 
                    className="mb-2 mx-2 bg-gray-100 dark:bg-zinc-800 rounded-lg p-3"
                >
                    <div className="flex items-center justify-between gap-1 max-w-full">
                        <div className="flex items-stretch space-x-2 min-w-0">
                            <div 
                            onClick={handleQuoteClick} 
                            className='w-screen gap-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 shadow-inner shadow-gray-300 dark:shadow-zinc-700 transition-colors rounded-lg flex flex-1 break-words text-sm dark:text-slate-200 overflow-hidden'
                            >
                                <div className="w-1 h-12 bg-brand rounded-full flex-shrink-0"/>
                                <div className="line-clamp-2 my-auto break-all">
                                    {quote.message?.content}
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                closeQuote();
                            }}
                            className="p-1 hover:bg-gray-300 dark:hover:bg-zinc-600 rounded-full transition-colors flex-shrink-0"
                        >
                            <X size={16} className="text-brand"/>
                        </button>
                    </div>
                </div>
            )}
            {firstUrl && (
                <div className="px-4 pb-2">
                    <LinkPreview url={firstUrl} />
                </div>
            )}
            
            <div className="flex items-end justify-between gap-2 mx-2">
                <div className="relative flex-1">
                    <Textarea
                        placeholder="Type a message..."
                        value={newMessage}
                        ref={textAreaRef}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            handleTyping();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                if (e.shiftKey) {
                                    e.preventDefault();
                                    return; // Allow new line when Shift+Enter
                                }
                                if (newMessage.trim().length > 0) {
                                    e.preventDefault();
                                    handleSendMessage(quote.message?._id);
                                }
                            }
                        }}
                        className="flex-1 min-h-10 h-10 max-h-[160px] px-4 py-2 bg-gray-100 dark:bg-zinc-800 dark:text-slate-200 border-none rounded-2xl resize-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
                    />
                    <EmojiPicker onChange={(emoji) => setNewMessage(prev => prev + emoji)}>
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-end pr-3 p-3 hover:text-brand/80 rounded-full"
                        >
                            <Smile size={20} className="flex-1 text-brand" />
                        </button>
                    </EmojiPicker>
                </div>
                <button
                    disabled={newMessage.length === 0}
                    onClick={() => handleSendMessage(quote.message?._id)}
                    className="py-2 px-1 mb-1 bg-transparent cursor-pointer text-white rounded-full transition-colors"
                >
                    <Send size={20} className="text-brand"/>
                </button>
            </div>
        </div>
    )
}

export default ChatTextarea;