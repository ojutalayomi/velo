import { TextAreaBox, Details } from "@ojutalayomi/react-textarea-enhanced";
import { Cross2Icon } from "@radix-ui/react-icons";
import {
  X,
  Send,
  Smile,
  Plus,
  Folder,
  Image,
  Paintbrush2,
  Expand,
  Shrink,
  Trash,
  BarChart3,
  Mic,
  MapPin,
  Music,
  Type,
  UserRound,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import { toast } from "@/lib/toast";

import CropMediaInterface from "@/components/CropMediaInterface";
import { DocCard } from "@/components/DocCard";
import { PollCreator } from "@/components/PollCreator";
import { LinkPreview } from "@/components/LinkPreview";
import { Button } from "@/components/ui/button";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import {
  FullscreenSheet,
  FullscreenSheetClose,
  FullscreenSheetContent,
  FullscreenSheetDescription,
  FullscreenSheetTitle,
  SheetIconButton,
} from "@/components/ui/fullscreen-sheet";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MOBILE_QUERY } from "@/components/ui/responsive-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMediaQuery } from "usehooks-ts";
import { useGlobalFileStorage } from "@/hooks/useFileStorage";
import { chatDraftKey, useDraftValue } from "@/hooks/useDraft";
import { useMentionPicker } from "@/hooks/useMentionPicker";
import { klipyEnabled, reportKlipyShare } from "@/lib/klipy";
import { setMarkdownPreference, useMarkdownPreference } from "@/hooks/useMarkdownPreference";
import { ExpressionPicker } from "@/components/chat/ExpressionPicker";
import { ContactPicker } from "@/components/chat/ContactPicker";
import { LocationPicker } from "@/components/LocationPicker";
import { ViewOnceToggle } from "@/components/chat/ViewOnceToggle";
import { VoiceRecorderBar } from "@/components/chat/VoiceRecorderBar";
import { MAX_VOICE_SECONDS, useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import type { MessageType } from "@/lib/types/type";
import type { PollData } from "@/lib/polls";
import { blockFilesWhenOffline } from "@/lib/offlineFiles";
import { cn, FILE_VALIDATION_CONFIG, formatFileSize, validateFile } from "@/lib/utils";
import { useAppDispatch } from "@/redux/hooks";
import { RootState } from "@/redux/store";
import { setToggleDialog } from "@/redux/utilsSlice";

/** Phones and tablets (a coarse primary pointer) get Enter as a newline key. */
const TOUCH_QUERY = "(pointer: coarse)";

/**
 * Whether this keydown should send the message. Enter sends on a desktop keyboard (not with Shift,
 * and never while an IME is composing text); on touch devices only Ctrl/Cmd+Enter does, so the
 * on-screen Enter key can start a new line.
 */
export function shouldSendOnEnter(
  e: Pick<React.KeyboardEvent, "key" | "shiftKey" | "ctrlKey" | "metaKey" | "nativeEvent">,
  isTouch: boolean
) {
  if (e.key !== "Enter" || e.shiftKey || e.nativeEvent?.isComposing) return false;
  return isTouch ? e.ctrlKey || e.metaKey : true;
}

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
  /** Controlled text. Leave it out to use the saved draft for `chatId`. */
  newMessage?: string;
  disabled?: boolean;
  chatId?: string;
  setNewMessage: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: (
    messageId: string,
    mentions?: { userId: string; username: string }[],
    override?: { content: string; messageType: MessageType },
    options?: SendOptions
  ) => void;
  handleTyping?: (hasText?: boolean) => void;
  closeQuote: () => void;
}

const ChatTextarea = ({
  quote,
  newMessage: newMessageProp,
  disabled,
  chatId,
  setNewMessage,
  handleSendMessage,
  handleTyping,
  closeQuote,
}: ChatTextareaProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const draft = useDraftValue(chatDraftKey(chatId ?? ""));
  const newMessage = newMessageProp ?? draft;
  const { userdata } = useSelector((state: RootState) => state.user);
  const groupInfo = useSelector((state: RootState) =>
    state.chat.conversations.find((convo) => convo.id === chatId)
  );
  const isGroup = groupInfo?.type === "Group";
  // A bot only reads text, so files and polls are not offered in its chat.
  const isBotChat = Boolean(groupInfo?.isBot);
  const isGroupAdmin = isGroup && Boolean(groupInfo?.adminIds?.includes(String(userdata._id)));
  // @all is offered to admins only (the server enforces this too); @ai to anyone in a group.
  const specials = useMemo(
    () => [
      ...(isGroupAdmin
        ? [{ userId: "all", username: "all", name: "Everyone", displayPicture: "" }]
        : []),
      ...(isGroup ? [{ userId: "ai", username: "ai", name: "Velo AI", displayPicture: "" }] : []),
    ],
    [isGroup, isGroupAdmin]
  );
  const { showPicker, filteredParticipants, isFetching, mentions, selectMention, clearMentions } = useMentionPicker(chatId ?? null, newMessage, textAreaRef, specials, userdata._id);
  const inputRef = useRef<HTMLInputElement>(null);

  // TextAreaBox only resizes on its own text state, which lags the parent value by a render.
  // When the message is emptied (e.g. after sending), collapse the textarea back to its base height.
  useEffect(() => {
    if (newMessage !== "") return;
    const raf = requestAnimationFrame(() => {
      const ta = textAreaRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    });
    return () => cancelAnimationFrame(raf);
  }, [newMessage]);
  const dispatch = useAppDispatch();
  const { toggleDialog } = useSelector((state: RootState) => state.utils);
  const [fileAccepts, setFileAccepts] = useState("");
  const [expanded, setExpanded] = useState<boolean>(false);
  const { files: attachments, clearFiles, setFiles } = useGlobalFileStorage();
  const [txtButton, setTxtButton] = useState(false);

  const [locationOpen, setLocationOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const userId = userdata._id;
  const sendShare = useCallback(
    (content: string, messageType: MessageType) =>
      handleSendMessage(quote.message?._id, undefined, { content, messageType }),
    [handleSendMessage, quote.message?._id]
  );
  const markdown = useMarkdownPreference();
  const voice = useVoiceRecorder();
  const [voiceViewOnce, setVoiceViewOnce] = useState(false);
  const sendVoiceNote = useCallback(async () => {
    const file = await voice.stop();
    if (!file) return;
    pendingVoiceRef.current.file = file;
    pendingVoiceRef.current.viewOnce = voiceViewOnce;
    setFiles([file]);
  }, [voice, setFiles, voiceViewOnce]);
  // Recordings are capped; reaching the cap sends what was recorded.
  useEffect(() => {
    if (voice.recording && voice.seconds >= MAX_VOICE_SECONDS) void sendVoiceNote();
  }, [voice.recording, voice.seconds, sendVoiceNote]);
  const startVoiceNote = useCallback(async () => {
    setVoiceViewOnce(false);
    const error = await voice.start();
    if (error) toast.error(error, { duration: 8000 });
  }, [voice]);

  const [pollOpen, setPollOpen] = useState(false);
  const sendPoll = useCallback(
    (poll: PollData) => {
      handleSendMessage(quote.message?._id, undefined, {
        content: JSON.stringify(poll),
        messageType: "Poll",
      });
    },
    [handleSendMessage, quote.message?._id]
  );

  const handleSendWithMentions = useCallback(
    (messageId: string, options?: SendOptions) => {
      handleSendMessage(messageId, mentions, undefined, options);
      clearMentions();
    },
    [handleSendMessage, mentions, clearMentions]
  );

  // Memoize handleInput to use details parameter instead of state
  const handleInput = useCallback((details: Details) => {
    if (details.text.length === 0) {
      setExpanded(false);
    }
    setTxtButton(details.text !== "");
  }, []);

  // A recorded voice note is sent straight away, so it must not open the preview dialog.
  const pendingVoiceRef = useRef<{ file: File | null; viewOnce: boolean }>({ file: null, viewOnce: false });

  useEffect(() => {
    if (pendingVoiceRef.current.file) return;
    if (attachments.length > 0 && pathname && pathname.includes("/chats")) {
      dispatch(setToggleDialog(true));
    }
  }, [attachments, dispatch, pathname]);

  useEffect(() => {
    const pending = pendingVoiceRef.current.file;
    if (pending && attachments.includes(pending)) {
      // Clearing a ref in an effect is intended; the compiler lint cannot tell it from a hook argument.
      // eslint-disable-next-line react-hooks/immutability
      pendingVoiceRef.current.file = null;
      handleSendWithMentions(quote.message?._id, { viewOnce: pendingVoiceRef.current.viewOnce });
      // eslint-disable-next-line react-hooks/immutability
      pendingVoiceRef.current.viewOnce = false;
    }
  }, [attachments, handleSendWithMentions, quote.message?._id]);

  useEffect(() => {
    const currParams = new URLSearchParams(searchParams?.toString() || "");
    if (toggleDialog) currParams.set("toggleDialog", "true");
    else currParams.delete("toggleDialog");
    const query = currParams.toString();
    const target = `${pathname}${query ? "?" + query : ""}`;
    // Already there (the case on every page load): navigating would make Next re-fetch this page
    // from the server for nothing, which also breaks opening a saved page offline.
    if (target === `${window.location.pathname}${window.location.search}`) return;
    router.replace(target, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleDialog]);

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

  const handleFiles = fileHandler(attachments, clearFiles, setFiles);

  // Memoize getDetails callback to prevent infinite re-renders
  const handleGetDetails = useCallback(
    (details: Details) => {
      handleInput(details);
      handleTyping?.(details.text.length > 0);
    },
    [handleTyping, handleInput]
  );

  // On a phone's on-screen keyboard Enter starts a new line and the Send button sends; on a
  // desktop keyboard Enter sends and Shift+Enter starts a new line.
  const isTouch = useMediaQuery(TOUCH_QUERY);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!shouldSendOnEnter(e, isTouch)) return;
      e.preventDefault(); // otherwise the newline lands in the box as the message is cleared
      if (newMessage.trim().length > 0) {
        handleSendWithMentions(quote.message?._id);
        dispatch(setToggleDialog(false)); // Explicitly set to false rather than toggle
      }
    },
    [isTouch, newMessage, handleSendWithMentions, quote.message?._id, dispatch]
  );

  // Memoize className to prevent re-renders
  const textAreaClassName = useMemo(
    () =>
      `max-h-[160px] ${expanded ? "min-h-[80vh]!" : "min-h-5!"} flex-1 resize-none rounded-2xl border-none bg-gray-100 px-4 py-2 text-sm text-black! focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-white dark:bg-zinc-800 dark:text-slate-200! dark:caret-white! dark:focus:ring-offset-zinc-900`,
    [expanded]
  );

  // Memoize emoji picker trigger className
  const emojiPickerTriggerClassName = useMemo(
    () =>
      `absolute inset-y-0 right-0 flex ${txtButton ? "items-end" : "items-center"} p-3 hover:text-brand/80 rounded-full z-10`,
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
    handleSendWithMentions(quote.message?._id);
  }, [handleSendWithMentions, quote.message?._id]);

  const urls = extractUrls(newMessage);
  const firstUrl = urls[0];

  return (
    <div className="relative w-full">
      <div
        className={cn(
          "sticky inset-x-0 bottom-0 z-10 border-t bg-white/80 p-2 backdrop-blur-lg tablets1:absolute tablets1:inset-x-auto tablets1:w-full dark:border-zinc-800 dark:bg-zinc-900/80",
          disabled ? " pointer-events-none opacity-70" : ""
        )}
      >
        {quote.state && (
          <div className="mb-2 rounded-lg bg-gray-100 p-1 dark:bg-zinc-800">
            <div className="flex max-w-full items-center justify-between gap-1">
              <div className="flex min-w-0 items-stretch space-x-2">
                <div
                  onClick={handleQuoteClick}
                  className="flex w-screen flex-1 cursor-pointer gap-2 overflow-hidden wrap-break-word rounded-lg text-sm shadow-inner shadow-gray-300 transition-colors hover:bg-gray-200 dark:text-slate-200 dark:shadow-zinc-700 dark:hover:bg-zinc-700"
                >
                  <div className="h-12 w-1 shrink-0 rounded-full bg-brand" />
                  <div className="my-auto line-clamp-2 break-all">{quote.message?.content}</div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeQuote();
                }}
                className="shrink-0 rounded-full p-1 transition-colors hover:bg-gray-300 dark:hover:bg-zinc-600"
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
            handleSendMessage={handleSendWithMentions}
            setFileAccepts={setFileAccepts}
          />
        )}

        {(voice.recording || voice.processing) && (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <VoiceRecorderBar voice={voice} onSend={() => void sendVoiceNote()} />
            </div>
            {voice.recording && (
              <ViewOnceToggle on={voiceViewOnce} onChange={setVoiceViewOnce} className="border-brand/60 text-brand" />
            )}
          </div>
        )}
        {markdown && !voice.recording && !voice.processing && (
          <button
            type="button"
            onClick={() => setMarkdownPreference(false)}
            title="Sending as Markdown. Click to switch back to plain text."
            className="mb-1 ml-2 inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand hover:bg-brand/20"
          >
            <Type size={12} />
            Markdown on
            <X size={12} />
          </button>
        )}
        <div className={cn("flex items-end justify-between gap-2", (voice.recording || voice.processing) && "hidden")}>
          <Pop
            input={inputRef}
            setFileAccepts={setFileAccepts}
            onPoll={isBotChat ? undefined : () => setPollOpen(true)}
            textOnly={isBotChat}
            onLocation={() => setLocationOpen(true)}
            onContact={() => setContactOpen(true)}
            markdown={markdown}
          />
          <LocationPicker
            key={locationOpen ? "location-open" : "location-closed"}
            open={locationOpen}
            onOpenChange={setLocationOpen}
            onSelect={(location) => sendShare(JSON.stringify(location), "Location")}
          />
          <ContactPicker
            open={contactOpen}
            onOpenChange={setContactOpen}
            onSelect={(contact) => sendShare(JSON.stringify(contact), "Contact")}
          />
          <PollCreator
            key={pollOpen ? "open" : "closed"}
            open={pollOpen}
            onOpenChange={setPollOpen}
            onCreate={sendPoll}
          />
          <div className="relative flex-1">
            {/* Mention picker */}
            {showPicker && (
              <div className="absolute bottom-full left-0 z-50 mb-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                {isFetching ? (
                  <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading members…
                  </div>
                ) : filteredParticipants.length === 0 ? (
                  <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    No members found
                  </div>
                ) : (
                  <ul>
                    {filteredParticipants.map((p) => (
                      <li
                        key={p.userId}
                        className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700"
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevent textarea blur on click
                          const updated = selectMention(p);
                          setNewMessage(updated);
                        }}
                      >
                        <Avatar className="size-7">
                          <AvatarImage src={p.displayPicture} alt={p.name} />
                          <AvatarFallback className="text-xs">{p.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium dark:text-white">{p.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">@{p.username}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <TextAreaBox
              value={newMessage}
              onChange={setNewMessage}
              highlightColor="#ff6257"
              id="txt"
              placeholder="Type a message..."
              minHeight={20}
              // maxHeight={160}
              ref={textAreaRef}
              getDetails={handleGetDetails}
              onKeyDown={handleKeyDown}
              enterKeyHint={isTouch ? "enter" : "send"}
              fontFamily="myCustomFont, myCustomFont Fallback"
              className={textAreaClassName}
              textareaClassName="caret-black! dark:caret-white! placeholder:text-black! dark:placeholder:text-slate-200!"
            />
            <>
              {newMessage.length > 100 && (
                <Button
                  variant="secondary"
                  onClick={handleExpandToggle}
                  className="absolute right-0 top-0 z-30 mr-1 rounded-full bg-transparent p-3 transition-colors hover:text-brand/90"
                >
                  {expanded ? (
                    <Shrink size={20} className="text-brand" />
                  ) : (
                    <Expand size={20} className="text-brand" />
                  )}
                </Button>
              )}
              <ExpressionPicker
                userId={String(userId)}
                triggerClassName={emojiPickerTriggerClassName}
                onEmoji={handleEmojiChange}
                onGif={
                  klipyEnabled()
                    ? ({ kind, item, query, customerId }) => {
                        sendShare(
                          JSON.stringify({ provider: "klipy", ...item }),
                          kind === "stickers" ? "Sticker" : "AnimatedGIF"
                        );
                        reportKlipyShare(kind, item.slug, customerId, query);
                      }
                    : undefined
                }
              >
                <Smile size={20} className="flex-1 text-brand" />
              </ExpressionPicker>
            </>
          </div>
          {newMessage.length === 0 && attachments.length === 0 && !disabled && !isBotChat ? (
            <Button
              aria-label="Record a voice note"
              onClick={() => void startVoiceNote()}
              className="mb-1.5 h-auto cursor-pointer rounded-full bg-transparent p-2! px-1 text-white transition-colors dark:hover:bg-neutral-800"
            >
              <Mic size={30} className="text-brand" />
            </Button>
          ) : (
            <Button
              disabled={newMessage.length === 0 && attachments.length === 0}
              onClick={handleSendClick}
              className="mb-1.5 h-auto cursor-pointer rounded-full bg-transparent p-2! px-1 text-white transition-colors dark:hover:bg-neutral-800"
            >
              <Send size={30} className="text-brand" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatTextarea;

interface PopProps {
  input: RefObject<HTMLInputElement | null>;
  setFileAccepts: Dispatch<SetStateAction<string>>;
  onPoll?: () => void;
  onLocation?: () => void;
  onContact?: () => void;
  /** Hides the file, photo and audio items. */
  textOnly?: boolean;
  markdown?: boolean;
}

const Pop = ({ input, setFileAccepts, onPoll, onLocation, onContact, textOnly, markdown }: PopProps) => {
  const [open, setOpen] = useState<boolean>(false);
  const isMobile = useMediaQuery(MOBILE_QUERY);

  const fileOptions = [
    {
      icon: Folder,
      text: "File",
      onClick: () => {
        setFileAccepts(".txt, .pdf, .docx, .doc, .xls, .xlsx, .ppt, .pptx");
        if (input.current) {
          // The accept attribute must change before click(), so state alone is too late.
          // eslint-disable-next-line react-hooks/immutability
          input.current.accept = ".txt, .pdf, .docx, .doc, .xls, .xlsx, .ppt, .pptx";
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
          // The accept attribute must change before click(), so state alone is too late.
          // eslint-disable-next-line react-hooks/immutability
          input.current.accept = ".jpg, .jpeg, .png, .gif, .mp4, .mov, .mkv";
          input.current.click();
        }
      },
    },
    {
      icon: Music,
      text: "Audio",
      onClick: () => {
        setFileAccepts(".mp3, .wav, .m4a, .aac, .ogg, .flac");
        if (input.current) {
          // The accept attribute must change before click(), so state alone is too late.
          // eslint-disable-next-line react-hooks/immutability
          input.current.accept = ".mp3, .wav, .m4a, .aac, .ogg, .flac";
          input.current.click();
        }
      },
    },
  ];
  const options = [
    ...(textOnly ? [] : fileOptions),
    ...(onLocation ? [{ icon: MapPin, text: "Location", onClick: onLocation }] : []),
    ...(onContact ? [{ icon: UserRound, text: "Contact", onClick: onContact }] : []),
    ...(onPoll ? [{ icon: BarChart3, text: "Poll", onClick: onPoll }] : []),
    {
      icon: Type,
      text: markdown ? "Markdown: on" : "Markdown: off",
      onClick: () => setMarkdownPreference(!markdown),
    },
  ];
  const trigger = (
    <Button className="mb-1.5 h-auto cursor-pointer rounded-full bg-transparent p-2 text-white transition-colors dark:hover:bg-neutral-800">
      <Plus size={20} className="text-brand" />
    </Button>
  );

  // Phones get a bottom drawer with larger rows, like the message options.
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Attach</DrawerTitle>
            <DrawerDescription className="sr-only">Choose what to share in this chat</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            {options.map(({ icon: Icon, text, onClick }, index) => (
              <button
                key={index}
                type="button"
                className="flex w-full items-center gap-3 rounded px-2 py-3 hover:bg-gray-100 dark:hover:bg-zinc-700"
                onClick={() => {
                  onClick();
                  setOpen(false);
                }}
              >
                <Icon size={20} className="dark:text-gray-400" />
                <span className="text-base dark:text-white">{text}</span>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
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
  );
};

/** Per-send choices that aren't part of the message text. */
export type SendOptions = { viewOnce?: boolean };

interface UploadDialogProps {
  quote: QuoteProp;
  inputRef: RefObject<HTMLInputElement | null>;
  textAreaRef: RefObject<HTMLTextAreaElement | null>;
  newMessage: string;
  setNewMessage: Dispatch<SetStateAction<string>>;
  handleTyping?: (hasText?: boolean) => void;
  handleSendMessage: (messageId: string, options?: SendOptions) => void;
  setFileAccepts: Dispatch<SetStateAction<string>>;
}

const isImageFile = (file: File) =>
  file.type.startsWith("image/") && !/heic|heif/i.test(file.type);
const isVideoFile = (file: File) => file.type.startsWith("video/");

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
  const isTouch = useMediaQuery(TOUCH_QUERY);
  const [activeIndex, setActiveIndex] = useState(0);

  // One object URL per File, cached so renders reuse it. URLs are revoked only once the
  // file has left `attachments` (never on unmount, which StrictMode simulates and which
  // would leave still-rendered files pointing at a revoked URL).
  const urls = useMemo(() => attachments.map(getObjectURL), [attachments]);
  const liveFilesRef = useRef<File[]>([]);
  useEffect(() => {
    liveFilesRef.current.forEach((file) => {
      if (!attachments.includes(file)) revokeObjectURL(file);
    });
    liveFilesRef.current = attachments;
  }, [attachments]);

  const safeIndex = Math.min(activeIndex, Math.max(attachments.length - 1, 0));
  const activeFile = attachments[safeIndex];
  const activeUrl = urls[safeIndex];

  const removeFile = useCallback(
    (index: number) => {
      setFiles(attachments.filter((_, i) => i !== index));
      setActiveIndex((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
    },
    [attachments, setFiles]
  );

  const [viewOnce, setViewOnce] = useState(false);
  // Only a single photo or video can be view once; adding more files turns it off.
  const canViewOnce = attachments.length === 1 && (isImageFile(attachments[0]) || isVideoFile(attachments[0]));
  const send = () => {
    // Offline, keep the preview (and the picked files) open so nothing is hidden or lost.
    if (blockFilesWhenOffline(attachments.length)) return;
    handleSendMessage(quote.message?._id, { viewOnce: canViewOnce && viewOnce });
    setViewOnce(false);
    dispatch(setToggleDialog(false));
  };

  const touchStartX = useRef<number | null>(null);
  const step = (delta: number) =>
    setActiveIndex(Math.min(Math.max(safeIndex + delta, 0), attachments.length - 1));
  const canSend = newMessage.length > 0 || attachments.length > 0;

  return (
    <FullscreenSheet
      open={toggleDialog}
      onOpenChange={() => {
        if (toggleDialog) {
          dispatch(setToggleDialog(!toggleDialog));
          clearFiles();
        }
      }}
    >
      <FullscreenSheetContent>
        <header className="flex items-center gap-1 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <FullscreenSheetClose asChild>
            <SheetIconButton aria-label="Close preview">
              <Cross2Icon className="size-5" />
            </SheetIconButton>
          </FullscreenSheetClose>
          <div className="min-w-0 flex-1 px-1">
            <FullscreenSheetTitle className="truncate text-sm font-medium">
              {activeFile?.name ?? "Preview"}
            </FullscreenSheetTitle>
            <p className="truncate text-xs text-white/60">
              {attachments.length > 1 ? `${safeIndex + 1} of ${attachments.length} · ` : ""}
              {attachments.length}/{FILE_VALIDATION_CONFIG.maxFiles} files ·{" "}
              {formatFileSize(attachments.reduce((acc, file) => acc + file.size, 0))}
            </p>
          </div>
          {activeFile && isImageFile(activeFile) && (
            <CropMediaInterface files={attachments} setFiles={setFiles} imageIndex={safeIndex}>
              <SheetIconButton aria-label="Edit image">
                <Paintbrush2 size={20} />
              </SheetIconButton>
            </CropMediaInterface>
          )}
          {activeFile && (
            <SheetIconButton aria-label="Remove file" onClick={() => removeFile(safeIndex)}>
              <Trash size={20} />
            </SheetIconButton>
          )}
          <FullscreenSheetDescription className="sr-only">
            Preview attachments before sending
          </FullscreenSheetDescription>
        </header>

        {/* The picture gets every spare pixel. Swipe on phones, arrow buttons on larger screens. */}
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            touchStartX.current = null;
            const end = e.changedTouches[0]?.clientX;
            if (start == null || end == null || Math.abs(end - start) < 60) return;
            step(end < start ? 1 : -1);
          }}
        >
          {activeFile && activeUrl ? (
            isImageFile(activeFile) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={activeUrl}
                src={activeUrl}
                alt={activeFile.name}
                draggable={false}
                className="max-h-full max-w-full select-none rounded-lg object-contain"
              />
            ) : isVideoFile(activeFile) ? (
              <video
                key={activeUrl}
                src={activeUrl}
                controls
                playsInline
                className="max-h-full max-w-full rounded-lg bg-black"
              />
            ) : (
              <DocCard className="w-auto max-w-[90%]" file={activeFile} />
            )
          ) : null}

          {attachments.length > 1 && (
            <>
              <SheetIconButton
                aria-label="Previous file"
                disabled={safeIndex === 0}
                onClick={() => step(-1)}
                className="absolute left-3 top-1/2 hidden -translate-y-1/2 bg-black/50 backdrop-blur-xs sm:flex"
              >
                <ChevronLeft size={24} />
              </SheetIconButton>
              <SheetIconButton
                aria-label="Next file"
                disabled={safeIndex === attachments.length - 1}
                onClick={() => step(1)}
                className="absolute right-3 top-1/2 hidden -translate-y-1/2 bg-black/50 backdrop-blur-xs sm:flex"
              >
                <ChevronRight size={24} />
              </SheetIconButton>
            </>
          )}
        </div>

        {attachments.length > 1 && (
          // `mx-auto` on the inner row centres a short strip but, unlike `justify-center`, never
          // clips the first thumbnails when the row is wider than the screen.
          <div className="flex overflow-x-auto px-3 py-2">
            <div className="mx-auto flex gap-2">
              {attachments.map((file, index) => (
                <button
                  type="button"
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  aria-label={`Show ${file.name}`}
                  aria-current={index === safeIndex}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "size-14 shrink-0 overflow-hidden rounded-lg border-2 bg-zinc-800 transition-opacity",
                    index === safeIndex ? "border-brand" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  {urls[index] && isImageFile(file) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls[index]} alt="" className="size-full object-cover" />
                  ) : urls[index] && isVideoFile(file) ? (
                    <video src={urls[index]} className="size-full object-cover" muted />
                  ) : (
                    <span className="flex size-full items-center justify-center text-[10px] text-white">
                      {file.name.split(".").pop()?.toUpperCase().slice(0, 4)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Caption bar: pinned to the bottom, clear of the home indicator and the keyboard. */}
        <div className="border-t border-white/10 bg-zinc-900/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
            <Pop input={inputRef} setFileAccepts={setFileAccepts} />
            <div className="relative min-w-0 flex-1">
              <TextAreaBox
                value={newMessage}
                onChange={setNewMessage}
                highlightColor="#ff6257"
                placeholder="Add a caption..."
                minHeight={20}
                maxHeight={120}
                ref={textAreaRef}
                getDetails={(details) => {
                  handleTyping?.(details.text.length > 0);
                }}
                fontFamily="myCustomFont, myCustomFont Fallback"
                onKeyDown={(e) => {
                  if (!shouldSendOnEnter(e, isTouch)) return;
                  e.preventDefault();
                  if (canSend) send();
                }}
                enterKeyHint={isTouch ? "enter" : "send"}
                className="flex-1 resize-none rounded-2xl border-none bg-zinc-800 px-4 py-2 pr-11 text-sm text-slate-100! focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-zinc-900"
                textareaClassName="caret-white! placeholder:text-slate-400!"
              />
              <EmojiPicker
                triggerClassName="absolute inset-y-0 right-0 flex items-center p-3 hover:text-brand/80 rounded-full"
                onChange={(emoji) => setNewMessage((prev) => prev + emoji)}
              >
                <Smile size={20} className="flex-1 text-brand" />
              </EmojiPicker>
            </div>
            {canViewOnce && <ViewOnceToggle on={viewOnce} onChange={setViewOnce} />}
            <Button
              aria-label="Send"
              disabled={!canSend}
              onClick={send}
              className="mb-0.5 size-11 shrink-0 rounded-full bg-brand p-0 text-white hover:bg-brand/90"
            >
              <Send size={20} />
            </Button>
          </div>
        </div>
      </FullscreenSheetContent>
    </FullscreenSheet>
  );
};

const objectURLCache = new WeakMap<File, string>();

function getObjectURL(file: File) {
  let url = objectURLCache.get(file);
  if (!url) {
    url = URL.createObjectURL(file);
    objectURLCache.set(file, url);
  }
  return url;
}

function revokeObjectURL(file: File) {
  const url = objectURLCache.get(file);
  if (url) {
    URL.revokeObjectURL(url);
    objectURLCache.delete(file);
  }
}

function fileHandler(
  attachments: File[],
  clearFiles: () => void,
  setFiles: (files: File[]) => void
) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const validationErrors: string[] = [];
    const validFiles: File[] = [];

    // Check total number of files
    if (attachments.length + newFiles.length > FILE_VALIDATION_CONFIG.maxFiles) {
      toast.error("Warning", {
        description: `Maximum ${FILE_VALIDATION_CONFIG.maxFiles} files allowed`,
      });
      clearFiles();
      return;
    }

    // Calculate total size including existing files
    const existingSize = attachments.reduce((acc, file) => acc + file.size, 0);
    const newTotalSize = newFiles.reduce((acc, file) => acc + file.size, existingSize);

    if (newTotalSize > FILE_VALIDATION_CONFIG.maxTotalSize) {
      toast.error("Warning", {
        description: `Total size exceeds ${formatFileSize(FILE_VALIDATION_CONFIG.maxTotalSize)}`,
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
      validationErrors.forEach((error) =>
        toast.warning("Warning", {
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
