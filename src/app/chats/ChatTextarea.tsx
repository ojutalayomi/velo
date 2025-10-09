import { Cross2Icon } from "@radix-ui/react-icons";
import { X, Send, Smile, Plus, Folder, Image, Paintbrush2 } from "lucide-react";
import {
  ChangeEvent,
  Dispatch,
  RefObject,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";

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
import { Textarea } from "@/components/ui/textarea";
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
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  const { toggleDialog } = useSelector((state: RootState) => state.utils);
  const [fileAccepts, setFileAccepts] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const { files: attachments, clearFiles, setFiles } = useGlobalFileStorage();
  const [txtButton, setTxtButton] = useState(false);

  const handleInput = () => {
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.style.height = "38px";
      textArea.style.height = `${textArea.scrollHeight}px`;
      if (textArea.innerHTML !== "") setTxtButton(true);
      else setTxtButton(false);
    }
  };

  useEffect(() => {
    if (attachments.length) {
      dispatch(setToggleDialog(true));
    }
  }, [attachments]);

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
          />
        )}

        <div className="flex items-end justify-between gap-2">
          <Pop input={inputRef} setFileAccepts={setFileAccepts} />
          <div className="relative flex-1">
            <Textarea
              id="txt"
              placeholder="Type a message..."
              value={newMessage}
              ref={textAreaRef}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping?.(); // Add optional chaining to handle undefined
              }}
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
              onInput={handleInput}
              className="h-10 max-h-[160px] min-h-10 flex-1 resize-none rounded-2xl border-none bg-gray-100 px-4 py-2 focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-white dark:bg-zinc-800 dark:text-slate-200 dark:focus:ring-offset-zinc-900"
            />
            <EmojiPicker
              triggerClassName={`absolute inset-y-0 right-0 flex ${txtButton ? "items-end" : "items-center"} p-3 hover:text-brand/80 rounded-full`}
              onChange={(emoji) => setNewMessage((prev) => prev + emoji)}
            >
              <Smile size={20} className="flex-1 text-brand" />
            </EmojiPicker>
          </div>
          <Button
            disabled={newMessage.length === 0 && attachments.length === 0}
            onClick={() => handleSendMessage(quote.message?._id)}
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
        if (input.current) {
          setFileAccepts(".pdf, .docx");
          input.current.click();
        }
      },
    },
    {
      icon: Image,
      text: "Photos & Videos",
      onClick: () => {
        if (input.current) {
          setFileAccepts(".jpg, .jpeg, .png, .gif");
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
}

const UploadDialog = ({
  quote,
  inputRef,
  textAreaRef,
  newMessage,
  setNewMessage,
  handleTyping,
  handleSendMessage,
}: UploadDialogProps) => {
  const dispatch = useAppDispatch();
  const { toggleDialog } = useSelector((state: RootState) => state.utils);
  const { files: attachments, setFiles, clearFiles } = useGlobalFileStorage();

  const removeFile = (index: number) => {
    setFiles(attachments.filter((_, i) => i !== index));
    toast({
      title: "File removed",
    });
  };

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
          <p className="text-xs text-gray-500">
            Max file size: {formatFileSize(FILE_VALIDATION_CONFIG.maxFileSize)}. Total max size:{" "}
            {formatFileSize(FILE_VALIDATION_CONFIG.maxTotalSize)}. Allowed types:{" "}
            {Array.isArray(FILE_VALIDATION_CONFIG.allowedFileTypes)
              ? FILE_VALIDATION_CONFIG.allowedFileTypes.join(", ")
              : FILE_VALIDATION_CONFIG.allowedFileTypes}
          </p>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div className="flex h-full max-h-[70%] flex-1 rounded-md shadow-xl backdrop-blur-xl">
          {inputRef.current?.files && (
            <Carousel className="flex max-h-full w-full flex-1 items-center">
              <CarouselContent className="flex h-full max-h-[100%] gap-2 sm:aspect-auto">
                {attachments.map((File, key) => {
                  const objectURL = URL.createObjectURL(File);
                  const [_, fileType] = File.type.split("/");
                  // console.log(fileType)
                  const isImage = fileType === "png" || fileType === "jpeg" || fileType === "jpeg";
                  const isVideo = fileType === "mp4" || fileType === "mov" || fileType === "mkv";

                  return (
                    <CarouselItem
                      key={key + objectURL}
                      className="flex size-full items-center justify-center"
                    >
                      {isImage ? (
                        <>
                          <ImageDiv media={objectURL} host={false} />
                          <CropMediaInterface
                            files={attachments}
                            setFiles={setFiles}
                            imageIndex={key}
                          >
                            <button className="absolute left-2 top-2 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 mb:opacity-100">
                              <Paintbrush2 size={16} />
                            </button>
                          </CropMediaInterface>
                        </>
                      ) : isVideo ? (
                        <VideoDiv media={objectURL} host={false} />
                      ) : (
                        <DocCard className="w-auto" file={File} />
                      )}
                      <button
                        onClick={() => removeFile(key)}
                        className="absolute bottom-0 text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious className="left-2 hidden sm:flex" />
              <CarouselNext className="right-2 hidden sm:flex" />
            </Carousel>
          )}
        </div>
        <DialogFooter className="!flex-col items-center gap-2">
          {/* Total Size Indicator */}
          <div className="text-sm text-white dark:text-gray-600">
            Total Size: {formatFileSize(attachments.reduce((acc, file) => acc + file.size, 0))}
          </div>
          <div className="flex w-full flex-1 items-center justify-between gap-2 sm:max-w-96">
            <Pop input={inputRef} setFileAccepts={() => ".jpg, .jpeg, .png, .gif"} />
            <div className="relative flex-1">
              <Textarea
                placeholder="Type a message..."
                value={newMessage}
                ref={textAreaRef}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping?.();
                }}
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
                className="h-10 max-h-[160px] min-h-10 flex-1 resize-none rounded-2xl border-none bg-gray-100 px-4 py-2 focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-white dark:bg-zinc-800 dark:text-slate-200 dark:focus:ring-offset-zinc-900"
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
