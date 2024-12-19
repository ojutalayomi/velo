import { Textarea } from "@/components/ui/textarea";
import { X, Send } from "lucide-react";
import { useEffect, useRef } from "react";

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
    
    return (
        <div className="fixed bottom-0 w-[-webkit-fill-available] px-4 py-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-t dark:border-zinc-800 z-10">
            {quote.state && (
                <div 
                    className="mb-2 mx-2 bg-gray-100 dark:bg-zinc-800 rounded-lg p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    onClick={handleQuoteClick}
                >
                    <div className="flex items-start justify-between gap-1 max-w-full">
                        <div className="flex items-stretch space-x-2 min-w-0">
                            <div className="w-1 h-12 bg-brand rounded-full flex-shrink-0"/>
                            <div className='shadow-inner shadow-gray-300 dark:shadow-zinc-700 rounded-lg flex flex-1 break-words text-sm dark:text-slate-200 overflow-hidden'>
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
                            <X size={16} className="text-gray-500 dark:text-gray-400"/>
                        </button>
                    </div>
                </div>
            )}
            
            <div className="flex items-end gap-2 mx-2">
                <Textarea
                    placeholder="Type a message..."
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
                    className="flex-1 min-h-[40px] max-h-[160px] px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 dark:text-slate-200 border-none rounded-2xl resize-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
                />
                <button
                    onClick={() => handleSendMessage(quote.message?._id)}
                    className="p-3 bg-brand hover:bg-brand/90 text-white rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    )
}

export default ChatTextarea;