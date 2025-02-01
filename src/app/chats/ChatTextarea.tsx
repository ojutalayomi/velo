import { Textarea } from "@/components/ui/textarea";
import { X, Send, Smile, Plus, TextQuote, Folder, Image } from "lucide-react";
import { ChangeEvent, Dispatch, RefObject, SetStateAction, useEffect, useRef, useState } from "react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { LinkPreview } from '@/components/LinkPreview';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import ImageDiv from "@/components/imageDiv";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setToggleDialog, setAttachments, SerializableFile } from "@/redux/utilsSlice";
import VideoDiv from "@/templates/videoDiv";
import { DocCard } from "@/components/DocCard";
import { toast } from "@/hooks/use-toast";

interface FileValidationConfig {
    maxFileSize: number; // in bytes
    maxTotalSize: number; // in bytes
    maxFiles: number;
    allowedFileTypes: string[];
}

const FILE_VALIDATION_CONFIG: FileValidationConfig = {
    maxFileSize: 10 * 1024 * 1024, // 10MB per file
    maxTotalSize: 50 * 1024 * 1024, // 50MB total
    maxFiles: 5, // Maximum 5 files
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
};

const validateFile = (file: File, config: FileValidationConfig) => {
    // Check file size
    if (file.size > config.maxFileSize) {
      throw new Error(`File ${file.name} is too large. Maximum size is ${formatFileSize(config.maxFileSize)}`);
    }
  
    // Check file type
    if (!config.allowedFileTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed for ${file.name}`);
    }
  
    return true;
};
  
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

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
    const inputRef = useRef<HTMLInputElement>(null)
    const dispatch = useDispatch();
    const { toggleDialog, attachments } = useSelector((state: RootState) => state.utils);
    const [fileAccepts, setFileAccepts] = useState('')
    const [errors, setErrors] = useState<string[]>([]);

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
            textArea.style.height = '2.5rem';
        }
    }, [newMessage]);

    useEffect(() => {
        if(attachments) {
            dispatch(setToggleDialog(true))
        }
    }, [attachments])

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

    const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
        if(!inputRef.current) return
        const files = e.target.files;
        if (!files) return;
    
        const newFiles = Array.from(files);
        const validationErrors: string[] = [];
        const validFiles: SerializableFile[] = [];
    
        // Check total number of files
        if (attachments.length + newFiles.length > FILE_VALIDATION_CONFIG.maxFiles) {
            toast({
              title: 'Warning',
              description: `Maximum ${FILE_VALIDATION_CONFIG.maxFiles} files allowed`,
              variant: 'destructive'
            });
            dispatch(setAttachments([]));
          return;
        }
    
        // Calculate total size including existing files
        const existingSize = attachments.reduce((acc, file) => acc + file.size, 0);
        const newTotalSize = newFiles.reduce((acc, file) => acc + file.size, existingSize);
    
        if (newTotalSize > FILE_VALIDATION_CONFIG.maxTotalSize) {
            toast({
              title: 'Warning',
              description: `Total size exceeds ${formatFileSize(FILE_VALIDATION_CONFIG.maxTotalSize)}`,
              variant: 'destructive'
            });
            return;
        }
    
        // Validate each file
        newFiles.forEach(file => {
          try {
            validateFile(file, FILE_VALIDATION_CONFIG);
            validFiles.push({
                id: crypto.randomUUID(), // Generate unique ID
                name: file.name,
                size: file.size,
                type: file.type,
                url: URL.createObjectURL(file), // Create URL for preview
                lastModified: file.lastModified
            });
          } catch (error) {
            if (error instanceof Error) {
              validationErrors.push(error.message);
            }
          }
        });
    
        // Update state
        if (validationErrors.length > 0) {
          setErrors(validationErrors);
          validationErrors.forEach(error => toast({
            title: 'Warning',
            description: error
          }));
        }
    
        if (validFiles.length > 0) {
          dispatch(setAttachments([...attachments, ...validFiles]));
          toast({
            title: '',
            description: `Successfully added ${validFiles.length} files`
          });
        }
    
        // Reset input
        e.target.value = '';
    };

    const urls = extractUrls(newMessage);
    const firstUrl = urls[0];

    return (
        <div className="w-full relative">
            <div className="fixed tablets1:absolute bottom-0 left-0 tablets1:left-auto right-0 tablets1:right-auto tablets1:w-full px-2 py-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-t dark:border-zinc-800 z-50">
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

                <Input
                    accept={fileAccepts}
                    id="files"
                    ref={inputRef} 
                    type="file"
                    multiple 
                    onChange={handleFiles} 
                    className="hidden"
                />

                {toggleDialog && (
                    <UploadDialog quote={quote} inputRef={inputRef} textAreaRef={textAreaRef} newMessage={newMessage} setNewMessage={setNewMessage} handleTyping={handleTyping} handleSendMessage={handleSendMessage} />
                )}

                <div className="flex items-end justify-between gap-2">
                    <Pop input={inputRef} setFileAccepts={setFileAccepts}/>
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
                                className="absolute inset-y-0 right-0 flex items-end p-3 hover:text-brand/80 rounded-full"
                            >
                                <Smile size={20} className="flex-1 text-brand" />
                            </button>
                        </EmojiPicker>
                    </div>
                    <Button
                        disabled={newMessage.length === 0}
                        onClick={() => handleSendMessage(quote.message?._id)}
                        className="!p-2 px-1 mb-1.5 h-auto dark:hover:bg-neutral-800 bg-transparent cursor-pointer text-white rounded-full transition-colors"
                    >
                        <Send size={20} className="text-brand"/>
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default ChatTextarea;

interface PopProps {
    input: RefObject<HTMLInputElement | null>,
    setFileAccepts: Dispatch<SetStateAction<string>>
}

const Pop = ({input, setFileAccepts}: PopProps) => {
    const [open, setOpen] = useState<boolean>(false)

    const options = [
        {
            icon: Folder,
            text: 'File',
            onClick: () => {
                if(input.current){
                    setFileAccepts(".pdf, .docx")
                    input.current.click()
                }
            },
        },
        {
            icon: Image,
            text: 'Photos & Videos',
            onClick: () => {
                if(input.current){
                    setFileAccepts(".jpg, .jpeg, .png, .gif")
                    input.current.click()
                }
            },
        }
    ]
    return (
        <>
            <Popover open={open} onOpenChange={() => setOpen(!open)}>
                <PopoverTrigger asChild>
                    <Button className="p-2 mb-1.5 h-auto dark:hover:bg-neutral-800 bg-transparent cursor-pointer text-white rounded-full transition-colors">
                        <Plus size={20} className="text-brand"/>
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className='bg-white dark:bg-zinc-800 min-w-[160px] p-1 rounded-md shadow-lg w-auto'
                    align="start"
                    sideOffset={10}
                >
                <div className="flex flex-col">
                {options.map(({ icon: Icon, text, onClick }, index) => (
                    <button
                        key={index}
                        type="button"
                        className='flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded'
                        onClick={() => {
                            onClick();
                            setOpen(false)
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
    )
}

interface UploadDialogProps {
    quote: QuoteProp,
    inputRef: RefObject<HTMLInputElement | null>,
    textAreaRef: RefObject<HTMLTextAreaElement | null>,
    newMessage: string,
    setNewMessage: Dispatch<SetStateAction<string>>,
    handleTyping: () => void,
    handleSendMessage: (messageId: string) => void
}

const UploadDialog = ({quote, inputRef, textAreaRef, newMessage, setNewMessage, handleTyping, handleSendMessage}: UploadDialogProps) => {
    const dispatch = useDispatch();
    const { toggleDialog, attachments } = useSelector((state: RootState) => state.utils);

    const removeFile = (index: number) => {
        dispatch(setAttachments(attachments.filter((_, i) => i !== index)));
        toast({
            title: 'File removed'
        });
    };

    return (
        <Dialog open={toggleDialog} onOpenChange={() => dispatch(setToggleDialog(!toggleDialog))}>
            <DialogTrigger className="hidden"></DialogTrigger>
            <DialogContent className="flex flex-col w-screen h-screen sm:w-[90vw] max-w-none sm:h-[90vh]">
                <DialogHeader className="">
                    <DialogTitle>Preview</DialogTitle>
                    <p className="text-xs text-gray-500 sm:hidden">
                        Max file size: {formatFileSize(FILE_VALIDATION_CONFIG.maxFileSize)}.
                        Total max size: {formatFileSize(FILE_VALIDATION_CONFIG.maxTotalSize)}.
                        Allowed types: {FILE_VALIDATION_CONFIG.allowedFileTypes.join(', ')}
                    </p>
                    <DialogDescription>
                        <label className="block text-sm font-medium text-gray-700">
                            Attach Files ({attachments.length}/{FILE_VALIDATION_CONFIG.maxFiles})
                        </label>
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 flex rounded-md max-h-[80%] backdrop-blur-xl shadow-xl h-full">
                    {inputRef.current?.files && (
                        <Carousel className="w-full flex flex-1 items-center max-h-full">
                            <CarouselContent className="flex max-h-[100%] h-full gap-2 sm:aspect-auto p-6">
                            {attachments.map((File, key) => {
                                const objectURL = File.url;
                                const [_,fileType] = File.type.split('/')
                                console.log(fileType)
                                const isImage = fileType === 'png' || fileType === 'jpeg' || fileType === 'jpeg'
                                const isVideo = fileType === 'mp4' || fileType === 'mov' || fileType === 'mkv'

                                return(
                                    <CarouselItem key={key+objectURL} className="flex items-center justify-center w-full">
                                        {
                                            isImage ?
                                                <ImageDiv
                                                media={objectURL} 
                                                host={false}
                                                /> :
                                            isVideo ?
                                                <VideoDiv
                                                    media={objectURL} 
                                                    host={false}
                                                /> :
                                                <DocCard className="w-auto" file={File}/>
                                        }
                                        <button
                                        onClick={() => removeFile(key)}
                                        className="absolute bottom-0 text-red-500 hover:text-red-700"
                                        >
                                        Remove
                                        </button>
                                    </CarouselItem>
                                )
                            })}
                            </CarouselContent>
                            <CarouselPrevious className="hidden sm:flex left-2" />
                            <CarouselNext className="hidden sm:flex right-2" />
                        </Carousel>
                    )}
                </div>
                <DialogFooter className="!flex-col items-center gap-2">
                    {/* Total Size Indicator */}
                    <div className="text-sm text-gray-600">
                        Total Size: {formatFileSize(attachments.reduce((acc, file) => acc + file.size, 0))}
                    </div>
                    <div className="flex flex-1 items-end justify-between gap-2 w-full">
                        <Pop input={inputRef} setFileAccepts={() => ".jpg, .jpeg, .png, .gif"}/>
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
                                    className="absolute inset-y-0 right-0 flex items-end p-3 hover:text-brand/80 rounded-full"
                                >
                                    <Smile size={20} className="flex-1 text-brand" />
                                </button>
                            </EmojiPicker>
                        </div>
                        <Button
                            disabled={newMessage.length === 0}
                            onClick={() => handleSendMessage(quote.message?._id)}
                            className="!p-2 px-1 mb-1.5 h-auto dark:hover:bg-neutral-800 bg-transparent cursor-pointer text-white rounded-full transition-colors"
                        >
                            <Send size={20} className="text-brand"/>
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    )
}