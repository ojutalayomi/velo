import { Textarea } from "@/components/ui/textarea";
import { X, Send, Smile, Plus, TextQuote, Folder, Image } from "lucide-react";
import { ChangeEvent, Dispatch, RefObject, SetStateAction, useEffect, useRef, useState } from "react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { LinkPreview } from '@/components/LinkPreview';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import ImageDiv from "@/components/imageDiv";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setToggleDialog } from "@/redux/utilsSlice";
import VideoDiv from "@/templates/videoDiv";
import { DocCard } from "@/components/DocCard";
import { toast } from "@/hooks/use-toast";
import { useGlobalFileStorage } from "@/hooks/useFileStorage";
import { FILE_VALIDATION_CONFIG, formatFileSize, validateFile } from "@/lib/utils";
import { Cross2Icon } from "@radix-ui/react-icons";

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
    const { toggleDialog } = useSelector((state: RootState) => state.utils);
    const [fileAccepts, setFileAccepts] = useState('')
    const [errors, setErrors] = useState<string[]>([]);
    const { files: attachments, clearFiles, setFiles } = useGlobalFileStorage();
    const [txtButton, setTxtButton] = useState(false)
    
    const handleInput = () => {
        const textArea = textAreaRef.current;
        if (textArea) {
            textArea.style.height = '38px';
            textArea.style.height = `${textArea.scrollHeight}px`;
            if(textArea.innerHTML !== '') setTxtButton(true)
            else setTxtButton(false)
        }
    };

    useEffect(() => {
        if(attachments.length) {
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

    const handleFiles = fileHandler(inputRef, attachments, clearFiles, setErrors, setFiles);

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
                        <LinkPreview url={firstUrl} direction="row" />
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
                            id="txt"
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
                                        return; // Allow new line when Shift+Enter
                                    }
                                    
                                    e.preventDefault(); // Prevent default for all Enter cases
                                    
                                    if (newMessage.trim().length > 0) {
                                        handleSendMessage(quote.message?._id);
                                        dispatch(setToggleDialog(false)); // Explicitly set to false rather than toggle
                                    }
                                }
                            }}
                            onInput={handleInput}                            
                            className="flex-1 min-h-10 h-10 max-h-[160px] px-4 py-2 bg-gray-100 dark:bg-zinc-800 dark:text-slate-200 border-none rounded-2xl resize-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
                        />
                        <EmojiPicker onChange={(emoji) => setNewMessage(prev => prev + emoji)}>
                            <button
                                type="button"
                                className={`absolute inset-y-0 right-0 flex ${txtButton ? 'items-end' : 'items-center'} p-3 hover:text-brand/80 rounded-full`}
                            >
                                <Smile size={20} className="flex-1 text-brand" />
                            </button>
                        </EmojiPicker>
                    </div>
                    <Button
                        disabled={newMessage.length === 0 && attachments.length === 0}
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
    const { toggleDialog } = useSelector((state: RootState) => state.utils);
    const { files: attachments, setFiles, clearFiles } = useGlobalFileStorage();

    const removeFile = (index: number) => {
        setFiles(attachments.filter((_, i) => i !== index));
        toast({
            title: 'File removed'
        });
    };

    return (
        <Dialog open={toggleDialog} 
        onOpenChange={() => {
            if (toggleDialog) {
                dispatch(setToggleDialog(!toggleDialog))
                clearFiles()
            }
        }}>
            <DialogTrigger className="hidden"></DialogTrigger>
            <DialogContent className="backdrop-blur-xl bg-transparent border-0 flex flex-col w-screen h-screen max-w-none">
                <DialogHeader>
                    <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                        <Cross2Icon className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </DialogClose>
                    <DialogTitle className="dark:text-white text-black">
                        Preview
                        <b className="block text-sm font-medium text-white dark:text-gray-700">
                            Attach Files ({attachments.length}/{FILE_VALIDATION_CONFIG.maxFiles})
                        </b>
                    </DialogTitle>
                    <p className="text-xs text-gray-500">
                        Max file size: {formatFileSize(FILE_VALIDATION_CONFIG.maxFileSize)}.
                        Total max size: {formatFileSize(FILE_VALIDATION_CONFIG.maxTotalSize)}.
                        Allowed types: {Array.isArray(FILE_VALIDATION_CONFIG.allowedFileTypes) ? 
                                        FILE_VALIDATION_CONFIG.allowedFileTypes.join(', ') : 
                                        FILE_VALIDATION_CONFIG.allowedFileTypes}
                    </p>
                    <DialogDescription>
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 flex rounded-md max-h-[70%] backdrop-blur-xl shadow-xl h-full">
                    {inputRef.current?.files && (
                        <Carousel className="w-full flex flex-1 items-center max-h-full">
                            <CarouselContent className="flex max-h-[100%] h-full gap-2 sm:aspect-auto">
                            {attachments.map((File, key) => {
                                const objectURL = URL.createObjectURL(File);
                                const [_,fileType] = File.type.split('/')
                                // console.log(fileType)
                                const isImage = fileType === 'png' || fileType === 'jpeg' || fileType === 'jpeg'
                                const isVideo = fileType === 'mp4' || fileType === 'mov' || fileType === 'mkv'

                                return(
                                    <CarouselItem key={key+objectURL} className="flex items-center justify-center h-full w-full">
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
                    <div className="text-sm text-white dark:text-gray-600">
                        Total Size: {formatFileSize(attachments.reduce((acc, file) => acc + file.size, 0))}
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-2 w-full sm:max-w-96">
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
                                            return; // Allow new line when Shift+Enter
                                        }
                                        
                                        e.preventDefault(); // Prevent default for all Enter cases
                                        
                                        if (newMessage.trim().length > 0) {
                                            handleSendMessage(quote.message?._id);
                                            dispatch(setToggleDialog(false)); // Explicitly set to false rather than toggle
                                        }
                                    }
                                }}
                                className="flex-1 min-h-10 h-10 max-h-[160px] px-4 py-2 bg-gray-100 dark:bg-zinc-800 dark:text-slate-200 border-none rounded-2xl resize-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
                            />
                            <EmojiPicker onChange={(emoji) => setNewMessage(prev => prev + emoji)}>
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center p-3 hover:text-brand/80 rounded-full"
                                >
                                    <Smile size={20} className="flex-1 text-brand" />
                                </button>
                            </EmojiPicker>
                        </div>
                        <Button
                            disabled={newMessage.length === 0 && attachments.length === 0}
                            onClick={() => {
                                handleSendMessage(quote.message?._id)
                                dispatch(setToggleDialog(!toggleDialog))
                                console.log('send')
                            }}
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

function fileHandler(inputRef: RefObject<HTMLInputElement | null>, attachments: File[], clearFiles: () => void, setErrors: Dispatch<SetStateAction<string[]>>, setFiles: (files: File[]) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => {
        if (!inputRef.current) return;
        const files = e.target.files;
        if (!files) return;

        const newFiles = Array.from(files);
        const validationErrors: string[] = [];
        const validFiles: File[] = [];

        // Check total number of files
        if (attachments.length + newFiles.length > FILE_VALIDATION_CONFIG.maxFiles) {
            toast({
                title: 'Warning',
                description: `Maximum ${FILE_VALIDATION_CONFIG.maxFiles} files allowed`,
                variant: 'destructive'
            });
            clearFiles();
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
                validFiles.push(file);
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
            setFiles([...attachments, ...validFiles]);

        }

        // Reset input
        e.target.value = '';
    };
}
