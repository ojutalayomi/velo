import { Cross2Icon } from "@radix-ui/react-icons";
import { X, Send, Smile, Plus, Folder, Image, Paintbrush2, Expand, Shrink, Trash } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChangeEvent,
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { TextAreaBox, Details } from 'react-textarea-enhanced';

import CropMediaInterface from "@/components/CropMediaInterface";
import { DocCard } from "@/components/DocCard";
import ImageDiv from "@/components/imageDiv";
import { LinkPreview } from "@/components/LinkPreview";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { useGlobalFileStorage } from "@/hooks/useFileStorage";
import { cn, FILE_VALIDATION_CONFIG, formatFileSize, validateFile } from "@/lib/utils";
import { useAppDispatch } from "@/redux/hooks";
import { RootState } from "@/redux/store";
import { setToggleDialog } from "@/redux/utilsSlice";
import VideoDiv from "@/templates/videoDiv";



type Message = {
  _id: string;
  senderId: string;
  content: string;
};

type QuoteProp = {
  message: Message;
  state: boolean | undefined;
};

interface ChatTextareaProps {
  quote: QuoteProp;
  newMessage: string;
  disbled?: boolean;
  setNewMessage: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: (messageId: string) => void;
  handleTyping?: () => void;
  closeQuote: () => void;
}

const ChatTextarea = ({
  quote,
  newMessage,
  disbled,
  setNewMessage,
  handleSendMessage,
  handleTyping,
  closeQuote,
}: ChatTextareaProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  const { toggleDialog } = useSelector((state: RootState) => state.utils);
  const [fileAccepts, setFileAccepts] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<boolean>(false);
  const { files: attachments, clearFiles, setFiles } = useGlobalFileStorage();
  const [txtButton, setTxtButton] = useState(false);

  // Memoize handleInput to use details parameter instead of state
  const handleInput = useCallback((details: Details) => {
    if (details.text.length === 0) {
      setExpanded(false);
    }
    setTxtButton(details.text !== "");
  }, []);

  useEffect(() => {
    if (attachments.length) {
      dispatch(setToggleDialog(true));
    }
  }, [attachments, dispatch]);

  useEffect(() => {
    const currParams = new URLSearchParams(searchParams?.toString() || "");
    if (toggleDialog) {
      currParams.set("toggleDialog", "true");
      router.replace(`${pathname}?${currParams.toString()}`, { scroll: false });
    } else {
      currParams.delete("toggleDialog");
      router.replace(`${pathname}${currParams.toString() ? "?" + currParams.toString() : ""}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleDialog]);

  useEffect(() => {
    if (errors.length > 0) {
      toast({
        title: "Error",
        description: errors[0],
      });
      setErrors([]);
    }
  }, [errors]);

  const handleQuoteClick = () => {
    const messageElement = document.getElementById(quote.message?._id as string);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth" });
      // Add a brief highlight effect
      messageElement.classList.add("bg-brand/20");
      messageElement.classList.add("rounded-lg");
      setTimeout(() => {
        messageElement.classList.remove("bg-brand/20");
        messageElement.classList.remove("rounded-lg");
      }, 2000);
    }
  };

  const extractUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const handleFiles = fileHandler(inputRef, attachments, clearFiles, setErrors, setFiles);

  // Memoize getDetails callback to prevent infinite re-renders
  const handleGetDetails = useCallback(
    (details: Details) => {
      handleInput(details);
      handleTyping?.();
    },
    [handleTyping, handleInput]
  );

  // Memoize onKeyDown handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter") {
        if (e.shiftKey) {
          return; // Allow new line when Shift+Enter
        }

        e.preventDefault(); // Prevent default for all Enter cases

        if (newMessage.trim().length > 0) {
          handleSendMessage(quote.message?._id);
          dispatch(setToggleDialog(false)); // Explicitly set to false rather than toggle
        }
      }
    },
    [newMessage, handleSendMessage, quote.message?._id, dispatch]
  );

  // Memoize className to prevent re-renders
  const textAreaClassName = useMemo(
    () =>
      `max-h-[160px] ${expanded ? "!min-h-[80vh]" : "!min-h-5"} flex-1 resize-none rounded-2xl border-none bg-gray-100 px-4 py-2 text-sm !text-black focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-white dark:bg-zinc-800 dark:!text-slate-200 dark:!caret-white dark:focus:ring-offset-zinc-900`,
    [expanded]
  );

  // Memoize emoji picker trigger className
  const emojiPickerTriggerClassName = useMemo(
    () => `absolute inset-y-0 right-0 flex ${txtButton ? "items-end" : "items-center"} p-3 hover:text-brand/80 rounded-full`,
    [txtButton]
  );

  // Memoize expand button handler
  const handleExpandToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // Memoize emoji picker onChange handler
  const handleEmojiChange = useCallback(
    (emoji: string) => {
      setNewMessage((prev) => prev + emoji);
    },
    [setNewMessage]
  );

  // Memoize send button handler
  const handleSendClick = useCallback(() => {
    handleSendMessage(quote.message?._id);
  }, [handleSendMessage, quote.message?._id]);

  const urls = extractUrls(newMessage);
  const firstUrl = urls[0];

  return (
    <div className="relative w-full">
      <div className={cn("fixed inset-x-0 bottom-0 z-10 border-t bg-white/80 p-2 backdrop-blur-lg tablets1:absolute tablets1:inset-x-auto tablets1:w-full dark:border-zinc-800 dark:bg-zinc-900/80", disbled ? " pointer-events-none opacity-70" : "")}>
        {quote.state && (
          <div className="mx-2 mb-2 rounded-lg bg-gray-100 p-3 dark:bg-zinc-800">
            <div className="flex max-w-full items-center justify-between gap-1">
              <div className="flex min-w-0 items-stretch space-x-2">
                <div
                  onClick={handleQuoteClick}
                  className="flex w-screen flex-1 cursor-pointer gap-2 overflow-hidden break-words rounded-lg text-sm shadow-inner shadow-gray-300 transition-colors hover:bg-gray-200 dark:text-slate-200 dark:shadow-zinc-700 dark:hover:bg-zinc-700"
                >
                  <div className="h-12 w-1 flex-shrink-0 rounded-full bg-brand" />
                  <div className="my-auto line-clamp-2 break-all">{quote.message?.content}</div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeQuote();
                }}
                className="flex-shrink-0 rounded-full p-1 transition-colors hover:bg-gray-300 dark:hover:bg-zinc-600"
              >
                <X size={16} className="text-brand" />
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
          <UploadDialog
            quote={quote}
            inputRef={inputRef}
            textAreaRef={textAreaRef}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleTyping={handleTyping}
            handleSendMessage={handleSendMessage}
            setFileAccepts={setFileAccepts}
          />
        )}

        <div className="flex items-end justify-between gap-2">
          <Pop input={inputRef} setFileAccepts={setFileAccepts} />
          <div className="relative flex-1">
            <TextAreaBox
              value={newMessage}
              onChange={setNewMessage}
              highlightColor="#ff6257"
              id="txt"
              placeholder="Type a message..."
              minHeight={20}
              maxHeight={160}
              ref={textAreaRef}
              getDetails={handleGetDetails}
              onKeyDown={handleKeyDown}
              fontFamily="myCustomFont, myCustomFont Fallback"
              className={textAreaClassName}
              textareaClassName="!caret-black dark:!caret-white placeholder:!text-black dark:placeholder:!text-slate-200"
            />
            <>
              {newMessage.length > 100 && (
                <Button
                  variant="secondary"
                  onClick={handleExpandToggle}
                  className="absolute right-0 top-0 z-30 mr-1 rounded-full bg-transparent p-3 transition-colors hover:text-brand/90"
                >
                  {expanded ? <Shrink size={20} className="text-brand" /> : <Expand size={20} className="text-brand" />}
                </Button>
              )}
              <EmojiPicker triggerClassName={emojiPickerTriggerClassName} onChange={handleEmojiChange}>
                <Smile size={20} className="flex-1 text-brand" />
              </EmojiPicker>
            </>
          </div>
          <Button
            disabled={newMessage.length === 0 && attachments.length === 0}
            onClick={handleSendClick}
            className="mb-1.5 h-auto cursor-pointer rounded-full bg-transparent !p-2 px-1 text-white transition-colors dark:hover:bg-neutral-800"
          >
            <Send size={20} className="text-brand" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatTextarea;

interface PopProps {
  input: RefObject<HTMLInputElement | null>;
  setFileAccepts: Dispatch<SetStateAction<string>>;
}

const Pop = ({ input, setFileAccepts }: PopProps) => {
  const [open, setOpen] = useState<boolean>(false);

  const options = [
    {
      icon: Folder,
      text: "File",
      onClick: () => {
        setFileAccepts(".pdf, .docx, .doc, .xls, .xlsx, .ppt, .pptx");
        if (input.current) {
          input.current.accept = ".pdf, .docx, .doc, .xls, .xlsx, .ppt, .pptx";
          input.current.click();
        }
      },
    },
    {
      icon: Image,
      text: "Photos & Videos",
      onClick: () => {
        setFileAccepts(".jpg, .jpeg, .png, .gif, .mp4, .mov, .mkv");
        if (input.current) {
          input.current.accept = ".jpg, .jpeg, .png, .gif, .mp4, .mov, .mkv";
          input.current.click();
        }
      },
    },
  ];
  return (
    <>
      <Popover open={open} onOpenChange={() => setOpen(!open)}>
        <PopoverTrigger asChild>
          <Button className="mb-1.5 h-auto cursor-pointer rounded-full bg-transparent p-2 text-white transition-colors dark:hover:bg-neutral-800">
            <Plus size={20} className="text-brand" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto min-w-[160px] rounded-md bg-white p-1 shadow-lg dark:bg-zinc-800"
          align="start"
          sideOffset={10}
        >
          <div className="flex flex-col">
            {options.map(({ icon: Icon, text, onClick }, index) => (
              <button
                key={index}
                type="button"
                className="flex items-center gap-2 rounded p-2 hover:bg-gray-100 dark:hover:bg-zinc-700"
                onClick={() => {
                  onClick();
                  setOpen(false);
                }}
              >
                <Icon size={16} className="dark:text-gray-400" />
                <span className="text-sm dark:text-white">{text}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};

interface UploadDialogProps {
  quote: QuoteProp;
  inputRef: RefObject<HTMLInputElement | null>;
  textAreaRef: RefObject<HTMLTextAreaElement | null>;
  newMessage: string;
  setNewMessage: Dispatch<SetStateAction<string>>;
  handleTyping?: () => void;
  handleSendMessage: (messageId: string) => void;
  setFileAccepts: Dispatch<SetStateAction<string>>;
}

// Lazy-loaded carousel item component
const LazyCarouselItem = ({
  children,
  className,
  index,
}: {
  children: React.ReactNode;
  className?: string;
  index: number;
}) => {
  const [isVisible, setIsVisible] = useState(index === 0); // First item is always visible
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const item = itemRef.current;
    if (!item) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { rootMargin: "50px" } // Start loading 50px before entering viewport
    );

    observer.observe(item);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={itemRef} className={className}>
      {isVisible ? children : <div className="flex size-full items-center justify-center">Loading...</div>}
    </div>
  );
};

const UploadDialog = ({
  quote,
  inputRef,
  textAreaRef,
  newMessage,
  setNewMessage,
  handleTyping,
  handleSendMessage,
  setFileAccepts,
}: UploadDialogProps) => {
  const dispatch = useAppDispatch();
  const { toggleDialog } = useSelector((state: RootState) => state.utils);
  const { files: attachments, setFiles, clearFiles } = useGlobalFileStorage();

  // Create stable file key for comparison
  const getFileKey = useCallback((file: File) => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }, []);

  // Track previous URLs by file key to properly clean up only removed ones
  const prevURLsRef = useRef<Map<string, string>>(new Map());
  const fileToKeyMapRef = useRef<Map<File, string>>(new Map());

  // Memoize object URLs - only create when attachments change
  const objectURLs = useMemo(() => {
    const urlMap = new Map<File, string>();
    const currentFileKeys = new Set<string>();
    
    // Create URLs for current files
    attachments.forEach((file) => {
      const fileKey = getFileKey(file);
      currentFileKeys.add(fileKey);
      fileToKeyMapRef.current.set(file, fileKey);
      
      if (!prevURLsRef.current.has(fileKey)) {
        // Create new URL for new file
        urlMap.set(file, URL.createObjectURL(file));
      } else {
        // Reuse existing URL for file that's still present
        urlMap.set(file, prevURLsRef.current.get(fileKey)!);
      }
    });
    
    // Revoke URLs for files that are no longer in attachments
    prevURLsRef.current.forEach((url, fileKey) => {
      if (!currentFileKeys.has(fileKey)) {
        URL.revokeObjectURL(url);
      }
    });
    
    // Update refs for next render
    const newURLsMap = new Map<string, string>();
    urlMap.forEach((url, file) => {
      const fileKey = fileToKeyMapRef.current.get(file);
      if (fileKey) {
        newURLsMap.set(fileKey, url);
      }
    });
    prevURLsRef.current = newURLsMap;
    
    return urlMap;
  }, [attachments, getFileKey]);

  // Cleanup all URLs only on unmount
  useEffect(() => {
    const currentURLs = prevURLsRef.current;
    const currentFileToKeyMap = fileToKeyMapRef.current;
    
    return () => {
      // Revoke all URLs when component unmounts
      currentURLs.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      currentURLs.clear();
      currentFileToKeyMap.clear();
    };
  }, []);

  // Memoize removeFile handler
  const removeFile = useCallback(
    (index: number) => {
      const fileToRemove = attachments[index];
      if (fileToRemove) {
        const fileKey = getFileKey(fileToRemove);
        const url = prevURLsRef.current.get(fileKey);
        if (url) {
          URL.revokeObjectURL(url);
          prevURLsRef.current.delete(fileKey);
        }
        fileToKeyMapRef.current.delete(fileToRemove);
      }
      setFiles(attachments.filter((_, i) => i !== index));
      toast({
        title: "File removed",
      });
    },
    [attachments, setFiles, getFileKey]
  );

  // Memoize carousel content to prevent re-renders on text input changes
  const carouselContent = useMemo(() => {
    if (!inputRef.current?.files || attachments.length === 0) {
      return null;
    }

    // Configure Embla carousel options for better performance
    const carouselOpts = {
      duration: 20, // Faster transition duration (default is 25)
      dragFree: true, // Enable smooth dragging
      containScroll: "trimSnaps" as const, // Optimize scroll calculations
      loop: false, // Disable loop for better performance
    };

    return (
      <Carousel className="flex max-h-full w-full flex-1 items-center" opts={carouselOpts}>
        <CarouselContent className="flex h-full max-h-full gap-2 sm:aspect-auto">
          {attachments.map((file, index) => {
            const objectURL = objectURLs.get(file);
            if (!objectURL) return null;

            const [, fileType] = file.type.split("/");
            const isImage = fileType === "png" || fileType === "jpeg" || fileType === "jpg";
            const isVideo = fileType === "mp4" || fileType === "mov" || fileType === "mkv" || fileType === "avi" || fileType === "quicktime";

            // Stable key based on file properties
            const stableKey = `${file.name}-${file.size}-${file.lastModified}-${index}`;

            return (
              <CarouselItem
                key={stableKey}
                className="flex size-full flex-col items-center justify-center"
              >
                <LazyCarouselItem index={index} className="flex size-full flex-col items-center justify-center">
                  {isImage ? (
                    <>
                      <ImageDiv media={objectURL} host={false} />
                      <CropMediaInterface
                        files={attachments}
                        setFiles={setFiles}
                        imageIndex={index}
                      >
                        <button className="absolute left-2 top-2 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 mb:opacity-100">
                          <Paintbrush2 size={16} />
                        </button>
                      </CropMediaInterface>
                    </>
                  ) : isVideo ? (
                    <VideoDiv media={objectURL} host={false} />
                  ) : (
                    <DocCard className="w-auto" file={file} />
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => removeFile(index)}
                    className="absolute bottom-0"
                  >
                    <Trash size={16} className="text-white" />
                  </Button>
                </LazyCarouselItem>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {attachments.length > 1 && (
          <>
            <CarouselPrevious className="left-2 hidden sm:flex" />
            <CarouselNext className="right-2 hidden sm:flex" />
          </>
        )}
      </Carousel>
    );
  }, [attachments, inputRef, objectURLs, setFiles, removeFile]);

  return (
    <Dialog
      open={toggleDialog}
      onOpenChange={() => {
        if (toggleDialog) {
          dispatch(setToggleDialog(!toggleDialog));
          clearFiles();
        }
      }}
    >
      <DialogTrigger className="hidden"></DialogTrigger>
      <DialogContent className="flex h-screen w-screen max-w-none flex-col border-0 bg-transparent backdrop-blur-xl">
        <DialogHeader>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <Cross2Icon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogTitle className="text-black dark:text-white">
            Preview
            <b className="block text-sm font-medium text-white dark:text-gray-700">
              Attach Files ({attachments.length}/{FILE_VALIDATION_CONFIG.maxFiles})
            </b>
          </DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div className="flex h-full max-h-[70%] flex-1 rounded-md backdrop-blur-xl">
          {carouselContent}
        </div>
        <DialogFooter className="!flex-col items-center gap-2">
          {/* Total Size Indicator */}
          <div className="text-sm text-white dark:text-gray-600">
            Total Size: {formatFileSize(attachments.reduce((acc, file) => acc + file.size, 0))}
          </div>
          <div className="flex w-full flex-1 items-center justify-between gap-2 sm:max-w-screen-tablets md:max-w-[700px] lg:max-w-screen-900px">
            <Pop input={inputRef} setFileAccepts={setFileAccepts} />
            <div className="relative flex-1">
              <TextAreaBox
                value={newMessage}
                onChange={setNewMessage}
                highlightColor="#ff6257"
                placeholder="Type a message..."
                minHeight={20}
                maxHeight={120}
                ref={textAreaRef}
                getDetails={() => {
                  handleTyping?.();
                }}
                fontFamily="myCustomFont, myCustomFont Fallback"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
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
                className="flex-1 resize-none rounded-2xl border-none bg-gray-100 px-4 py-2 text-sm !text-black focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-white dark:bg-zinc-800 dark:!text-slate-200 dark:!caret-white dark:focus:ring-offset-zinc-900"
                textareaClassName="!caret-black dark:!caret-white placeholder:!text-black dark:placeholder:!text-slate-200"
              />
              <EmojiPicker
                triggerClassName="absolute inset-y-0 right-0 flex items-center p-3 hover:text-brand/80 rounded-full"
                onChange={(emoji) => setNewMessage((prev) => prev + emoji)}
              >
                <Smile size={20} className="flex-1 text-brand" />
              </EmojiPicker>
            </div>
            <Button
              disabled={newMessage.length === 0 && attachments.length === 0}
              onClick={() => {
                handleSendMessage(quote.message?._id);
                dispatch(setToggleDialog(!toggleDialog));
                // console.log('send')
              }}
              className="mb-1.5 h-auto cursor-pointer rounded-full bg-transparent !p-2 px-1 text-white transition-colors dark:hover:bg-neutral-800"
            >
              <Send size={20} className="text-brand" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function fileHandler(
  inputRef: RefObject<HTMLInputElement | null>,
  attachments: File[],
  clearFiles: () => void,
  setErrors: Dispatch<SetStateAction<string[]>>,
  setFiles: (files: File[]) => void
) {
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
        title: "Warning",
        description: `Maximum ${FILE_VALIDATION_CONFIG.maxFiles} files allowed`,
        variant: "destructive",
      });
      clearFiles();
      return;
    }

    // Calculate total size including existing files
    const existingSize = attachments.reduce((acc, file) => acc + file.size, 0);
    const newTotalSize = newFiles.reduce((acc, file) => acc + file.size, existingSize);

    if (newTotalSize > FILE_VALIDATION_CONFIG.maxTotalSize) {
      toast({
        title: "Warning",
        description: `Total size exceeds ${formatFileSize(FILE_VALIDATION_CONFIG.maxTotalSize)}`,
        variant: "destructive",
      });
      return;
    }

    // Validate each file
    newFiles.forEach((file) => {
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
      validationErrors.forEach((error) =>
        toast({
          title: "Warning",
          description: error,
        })
      );
    }

    if (validFiles.length > 0) {
      setFiles([...attachments, ...validFiles]);
    }

    // Reset input
    e.target.value = "";
  };
}
