"use client";
import React, { TouchEvent, useEffect, useState } from "react";
import Image from "next/image";
import {
  Check,
  CheckCheck,
  Copy,
  Ellipsis,
  Loader,
  TextQuote,
  Trash2,
  CircleCheck,
  CircleX,
  SmilePlus,
} from "lucide-react";
import { MessageAttributes, Reaction } from "@/lib/types/type";
import { useSelector } from "react-redux";
import { useUser } from "@/app/providers/UserProvider";
import {
  updateMessageReactions,
  deleteMessage,
  updateMessage,
  updateLiveTime,
  updateConversation,
} from "@/redux/chatSlice";
import { useSocket } from "@/app/providers/SocketProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { RootState } from "@/redux/store";
import { useAppDispatch } from "@/redux/hooks";
import { LinkPreview } from "@/components/LinkPreview";
import { addSelectedMessage, removeSelectedMessage } from "@/redux/utilsSlice";
import { MediaCollage } from "./FilesView";
import { Statuser } from "@/components/VerificationComponent";
import { renderTextWithLinks } from "../../components/RenderTextWithLinks";
import { ObjectId } from "mongodb";
import { generateObjectId } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactionsInfo } from "./ReactionsInfo";

type Message = {
  _id: string;
  senderId: string;
  content: string;
};

type QuoteProp = {
  message: Message;
  state: boolean | undefined;
};

type Props = {
  message: MessageAttributes;
  setQuote: React.Dispatch<React.SetStateAction<QuoteProp>>;
  chat?: string;
};

// Define the type for each option
type Option = {
  icon: React.ElementType; // Type for the icon component
  text: string; // Text to display
  onClick: () => void; // Click handler function
};

const MessageTab = ({ message, setQuote, chat = "DMs" }: Props) => {
  const dispatch = useAppDispatch();
  const { userdata } = useUser();
  const [open, setOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [options, openOptions] = useState<boolean>(false);
  const [messageContent, setMessageContent] = useState<string>(message.content.replace("≤≤≤", ""));
  const [time, setTime] = useState<string>(updateLiveTime("chat-time", message.timestamp));
  const socket = useSocket();
  const { selectedMessages } = useSelector((state: RootState) => state.utils);
  const [rectionInfoDisplay, setReactionInfoDisplay] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_LENGTH = 300; // Adjust this number to change when the "Read more" appears

  const senderId = message?.sender?.id || "";
  const sender = message?.sender?.name || "";
  const verified = message?.sender?.verified ?? false;
  const displayPicture = message?.sender?.displayPicture || "";
  // const url = "https://s3.amazonaws.com/profile-display-images/";

  useEffect(() => {
    setMessageContent(message.content.replace("≤≤≤", ""));
  }, [message.content]);

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case "sending":
        return <Loader size={15} className="animate-spin  min-w-3" />;
      case "sent":
        return <Check size={15} className=" min-w-3" />;
      case "delivered":
        return <CheckCheck size={15} className="dark:text-gray-400  min-w-3" />;
      case "failed":
        return <b className="text-red-800  min-w-3">Not sent!</b>;
      default:
        return <CheckCheck size={15} className="text-green-500  min-w-3" />;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (options && !(event.target as Element).closest(".edit-list")) {
        // console.log('Clicked outside options');
        openOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [options]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      openOptions(false);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Update the optionss array to use the defined type
  const IsSelected = selectedMessages.includes(String(message._id));
  const isRead = message.isRead?.[String(userdata._id)] || false;
  const optionss: Option[] = [
    {
      icon: TextQuote,
      text: "Quote",
      onClick: () =>
        setQuote({
          message: { content: messageContent, _id: message._id as string, senderId },
          state: true,
        }),
    },
    {
      icon: Copy,
      text: isCopied ? "Copied!" : "Copy message",
      onClick: copyToClipboard,
    },
    ...(senderId === userdata._id
      ? [
          {
            icon: Trash2,
            text: "Delete",
            onClick: () => {
              if (!message.content.endsWith("≤≤≤")) {
                if (socket) {
                  dispatch(
                    updateConversation({
                      id: message.chatId as string,
                      updates: { lastMessage: "This message was deleted" },
                    })
                  );
                  dispatch(
                    updateMessage({
                      id: message._id as string,
                      updates: { attachments: [], content: "You deleted this message.≤≤≤" },
                    })
                  );
                  openOptions(false);
                  socket.emit("updateConversation", {
                    id: message._id,
                    updates: { deleted: true },
                  });
                }
              } else {
                dispatch(deleteMessage(message._id as string));
              }
            },
          },
        ]
      : []),
    {
      icon: SmilePlus,
      text: "React",
      onClick: () => setReactionInfoDisplay(true),
    },
    {
      icon: IsSelected ? CircleX : CircleCheck,
      text: IsSelected ? "Unselect message" : "Select message",
      onClick: () =>
        dispatch(
          IsSelected
            ? removeSelectedMessage(message._id as string)
            : addSelectedMessage(message._id as string)
        ),
    },
  ];

  const extractUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [""];
  };

  const urls = extractUrls(messageContent);
  const firstUrl = urls[0]; // Only show preview for the first URL

  const handleTouch = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const longPressTimer = setTimeout(() => {
        dispatch(
          IsSelected
            ? removeSelectedMessage(message._id as string)
            : addSelectedMessage(message._id as string)
        );
      }, 500);

      const cancelLongPress = () => {
        clearTimeout(longPressTimer);
      };

      document.addEventListener("touchend", cancelLongPress);
      document.addEventListener("touchmove", cancelLongPress);

      return () => {
        document.removeEventListener("touchend", cancelLongPress);
        document.removeEventListener("touchmove", cancelLongPress);
      };
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    dispatch(
      IsSelected
        ? removeSelectedMessage(message._id as string)
        : addSelectedMessage(message._id as string)
    );
  };

  const handleTouch1 = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const longPressTimer = setTimeout(() => setOpen(true), 500);
      const cancelLongPress = () => clearTimeout(longPressTimer);
      document.addEventListener("touchend", cancelLongPress);
      document.addEventListener("touchmove", cancelLongPress);
      return () => {
        document.removeEventListener("touchend", cancelLongPress);
        document.removeEventListener("touchmove", cancelLongPress);
      };
    }
  };

  const handleContextMenu1 = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOpen(true);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (IsSelected) dispatch(removeSelectedMessage(message._id as string));
    if (selectedMessages.length) dispatch(addSelectedMessage(message._id as string));
  };

  if (chat === "Groups") {
    return (
      <>
        <div
          id={message._id as string}
          onClick={handleClick}
          onTouchStart={handleTouch}
          onContextMenu={handleContextMenu}
          className={`${senderId === userdata._id ? "items-end" : "items-start"} ${IsSelected && "bg-brand/20 py-2"} dark:text-gray-400 flex flex-col mb-4 transition-colors duration-300`}
        >
          <div
            className={`flex flex-1 max-w-[90%] ${senderId === userdata._id ? "flex-row-reverse ml-auto" : "mr-auto"} gap-3 items-start relative`}
          >
            <div
              className={`flex flex-col gap-1 flex-1 max-w-full ${senderId === userdata._id ? "items-end" : "items-start"}`}
            >
              {message.attachments.length ? <MediaCollage media={message.attachments} /> : <></>}

              {/* Message bubble */}
              <div
                className={`relative p-2 rounded-lg max-w-full ${
                  senderId === userdata._id
                    ? "bg-brand text-white rounded-tr-none"
                    : "bg-gray-100 dark:bg-zinc-800 rounded-tl-none"
                }`}
                onTouchStart={handleTouch1}
                onContextMenu={handleContextMenu1}
              >
                {/* Sender name for other users */}
                {senderId !== userdata._id && (
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <Avatar className="mt-1 size-8">
                        <AvatarImage src={displayPicture} alt={sender} />
                        <AvatarFallback>{sender?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {sender}
                      </span>
                      {verified && <Statuser className="size-4" />}
                    </div>
                    <Options options={optionss} open={open} setOpen={setOpen} />
                  </div>
                )}
                {/* Quote and Link Preview */}
                {message.quotedMessageId && <Quote message={message} senderId={senderId} />}
                {firstUrl && <LinkPreview url={firstUrl} />}
                <p className="py-1 text-sm whitespace-pre-wrap break-words">
                  {messageContent.length > MAX_LENGTH && !isExpanded
                    ? renderTextWithLinks(messageContent.slice(0, MAX_LENGTH) + "...")
                    : renderTextWithLinks(messageContent)}
                </p>

                {messageContent.length > MAX_LENGTH && (
                  <Button
                    variant="link"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`text-sm mt-1 ${
                      senderId === userdata._id ? "text-gray-200" : "text-gray-500"
                    } hover:underline`}
                  >
                    {isExpanded ? "Read less" : "Read more"}
                  </Button>
                )}

                {/* Time and status */}
                <div
                  className={`flex items-center gap-2 text-xs text-nowrap ${
                    senderId === userdata._id ? "justify-end" : "justify-start"
                  }`}
                >
                  {time}
                  {senderId === userdata._id && renderStatusIcon(message.status)}
                </div>
              </div>

              {/* Reactions */}
              <div
                className={`${senderId === userdata._id ? "flex-row-reverse ml-auto" : "mr-auto"} -mt-3 z-10 flex items-center gap-1`}
              >
                {senderId === userdata._id && (
                  <div className="flex items-center gap-1 dark:bg-zinc-800 bg-white rounded-full p-1 border dark:border-gray-200">
                    <Options options={optionss} open={open} setOpen={setOpen} />
                  </div>
                )}
                <ReactionSection
                  message={message}
                  senderId={senderId}
                  setReactionInfoDisplay={setReactionInfoDisplay}
                />
              </div>
            </div>
          </div>
        </div>
        {rectionInfoDisplay && (
          <ReactionsInfo message={message} setReactionInfoDisplay={setReactionInfoDisplay} />
        )}
      </>
    );
  }

  return (
    <>
      <div
        id={message._id as string}
        onClick={handleClick}
        onTouchStart={handleTouch}
        onContextMenu={handleContextMenu}
        className={`${senderId === userdata._id ? "items-end" : "items-start"} ${IsSelected && "bg-brand/20 py-2"} dark:text-gray-400 flex flex-col mb-2 transition-colors duration-300`}
      >
        {/* Main Message Container */}
        <div
          className={`flex flex-1 max-w-[90%] ${senderId === userdata._id ? "flex-row-reverse ml-auto" : "mr-auto"} gap-2 items-center relative`}
        >
          <div
            className={`flex flex-col gap-1 flex-1 max-w-full ${senderId === userdata._id ? "items-end" : "items-start"}`}
          >
            {message.attachments.length ? <MediaCollage media={message.attachments} /> : <></>}

            {/* Message Bubble */}
            <div
              className={`relative mb-1 p-2 rounded-2xl overflow-auto max-w-full flex flex-col shadow-sm ${
                senderId === userdata._id
                  ? "bg-brand rounded-br-none text-white"
                  : "bg-gray-50 rounded-bl-none dark:bg-zinc-800/80 dark:text-white"
              } text-left`}
              onTouchStart={handleTouch1}
              onContextMenu={handleContextMenu1}
            >
              {/* Quote and Link Preview */}
              {message.quotedMessageId && <Quote message={message} senderId={senderId} />}
              {firstUrl && <LinkPreview url={firstUrl} />}
              {/* Message Content */}
              <div className="">
                <p
                  className="py-1 text-sm whitespace-pre-wrap break-words"
                  style={{ fontFamily: "inherit" }}
                >
                  {messageContent.length > MAX_LENGTH && !isExpanded
                    ? renderTextWithLinks(messageContent.slice(0, MAX_LENGTH) + "...")
                    : renderTextWithLinks(messageContent)}
                </p>
                {messageContent.length > MAX_LENGTH && (
                  <Button
                    variant="link"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`text-sm mt-1 ${
                      senderId === userdata._id ? "text-gray-200" : "text-gray-500"
                    } hover:underline`}
                  >
                    {isExpanded ? "Read less" : "Read more"}
                  </Button>
                )}
              </div>
              <div
                className={`${senderId === userdata._id ? "text-right justify-end" : "text-left justify-start"} text-nowrap flex items-center gap-2 text-xs mt-1`}
              >
                <div className="dark:after:text-slate-200 after:content-[ • ]">{time}</div>
                {senderId === userdata._id && renderStatusIcon(message.status)}
              </div>
            </div>
          </div>

          {/* Message Options */}
          <Options options={optionss} open={open} setOpen={setOpen} />
        </div>

        {/* Message Footer */}
        {/* Reactions */}
        <ReactionSection
          message={message}
          senderId={senderId}
          setReactionInfoDisplay={setReactionInfoDisplay}
        />
      </div>
      {rectionInfoDisplay && (
        <ReactionsInfo message={message} setReactionInfoDisplay={setReactionInfoDisplay} />
      )}
    </>
  );
};

export default MessageTab;

const ReactionSection = ({
  message,
  senderId,
  setReactionInfoDisplay,
}: {
  message: MessageAttributes;
  senderId: string;
  setReactionInfoDisplay: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { userdata } = useUser();
  const socket = useSocket();
  const dispatch = useAppDispatch();

  const onEmojiClick = (emoji: string) => {
    if (message._id) {
      if (socket) {
        dispatch(
          updateMessageReactions({
            id: message._id as string,
            updates: {
              _id: generateObjectId() as unknown as ObjectId,
              messageId: message._id as string,
              userId: String(userdata._id),
              reaction: emoji,
              timestamp: new Date().toISOString(),
            },
          })
        );
        socket.emit("addReaction", {
          messageId: message._id as string,
          userId: String(userdata._id),
          reaction: emoji,
          timestamp: new Date().toISOString(),
        });
        setReactionInfoDisplay(false);
      }
    }
  };

  const reactionArray: Reaction[] = [];

  if (message.reactions.length === 0) return null;

  return (
    <div
      className="-mt-3 z-10 flex flex-wrap gap-1 items-center dark:bg-zinc-800 bg-white rounded-full px-1 py-0.5 border dark:border-gray-200"
      onClick={() => setReactionInfoDisplay(true)}
    >
      {message.reactions.reduce((acc: React.ReactNode[], reaction, index) => {
        if (
          !reactionArray.find((r) => r.reaction === reaction.reaction) &&
          reactionArray.length <= 5
        ) {
          reactionArray.push(reaction);
          const reactionCount = message.reactions.filter(
            (r) => r.reaction === reaction.reaction
          ).length;
          const check =
            reactionCount > 1 &&
            message.reactions.find(
              (r) => r.userId === userdata._id && r.reaction === reaction.reaction
            );
          acc.push(
            <span key={index} title={`${reaction.userId}`} className="cursor-pointer text-xs">
              {reaction.reaction}
              {reactionCount > 1 && <sub className="ml-0.5 text-xs">{reactionCount}</sub>}
            </span>
          );
        }
        return acc;
      }, [])}
      {reactionArray.length > 5 && (
        <span
          className={`px-2 py-0.5 rounded-full text-xs ${
            senderId === userdata._id ? "bg-white/10" : "bg-gray-200 dark:bg-zinc-700"
          }`}
        >
          +{reactionArray.length - 5}
        </span>
      )}
    </div>
  );
};

const Quote = ({ message, senderId }: { message: MessageAttributes; senderId: string }) => {
  const { userdata } = useUser();
  const messages = useSelector((state: RootState) => state.chat.messages);

  const Messages = messages?.filter((msg) => {
    const sender = "sender" in msg ? msg?.sender?.name : "";
    return msg.chatId === message.chatId;
  });

  const quotedMessageId = Messages?.find((m) => (m._id as string) === message.quotedMessageId);

  const handleQuoteClick = () => {
    const messageElement = document.getElementById(message.quotedMessageId as string);
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

  return (
    <div
      className={`flex m-1 ${senderId === userdata._id ? "flex-row-reverse" : ""}`}
      onClick={handleQuoteClick}
    >
      <div
        className={`
          flex items-center gap-2 w-full max-w-full p-2 rounded-lg cursor-pointer
          ${
            senderId === userdata._id
              ? "bg-emerald-100 dark:bg-emerald-900/30"
              : "bg-gray-100 dark:bg-zinc-700/50"
          }
          border-l-4 ${senderId === userdata._id ? "border-emerald-500" : "border-gray-400"}
          hover:bg-opacity-80 transition-all
        `}
      >
        <div className="flex flex-col overflow-auto max-w-full">
          <span
            className={`text-xs font-medium ${senderId === userdata._id ? "text-emerald-700 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300"}`}
          >
            {quotedMessageId?.sender?.name || ""}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
            {quotedMessageId?.content}
          </span>
        </div>
      </div>
    </div>
  );
};

function Options({
  options,
  open,
  setOpen,
}: {
  options: Option[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Handle mobile drawer
  const handleDrawerChange = (open: boolean) => {
    setIsDrawerOpen(open);
    setOpen(open);
  };

  // Handle desktop popover
  const handlePopoverChange = (open: boolean) => {
    setIsPopoverOpen(open);
    setOpen(open);
  };

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer open={open} onOpenChange={handleDrawerChange}>
        <DrawerTrigger asChild>
          <button type="button" className="hidden" aria-label="Open message options">
            <Ellipsis size={20} className="cursor-pointer dark:text-gray-400" />
          </button>
        </DrawerTrigger>
        <DrawerContent className="tablets:hidden">
          <DrawerHeader>
            <DrawerTitle>Message Options</DrawerTitle>
          </DrawerHeader>
          <div className="px-4">
            {options.map(({ icon: Icon, text, onClick }, index) => (
              <button
                key={index}
                type="button"
                className="flex w-full items-center gap-3 py-3 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded px-2"
                onClick={(e) => {
                  e.preventDefault();
                  onClick();
                  handleDrawerChange(false);
                }}
              >
                <Icon size={20} className="dark:text-gray-400" />
                <span className="text-base dark:text-white">{text}</span>
              </button>
            ))}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Desktop Popover */}
      <Popover open={open} onOpenChange={handlePopoverChange}>
        <PopoverTrigger asChild>
          <button type="button" className="hidden tablets:block" aria-label="Open message options">
            <Ellipsis size={20} className="cursor-pointer dark:text-gray-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="bg-white dark:bg-zinc-800 hidden tablets:block min-w-[160px] p-1 rounded-md shadow-lg w-auto"
          align="end"
          sideOffset={5}
        >
          <div className="flex flex-col">
            {options.map(({ icon: Icon, text, onClick }, index) => (
              <button
                key={index}
                type="button"
                className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
                onClick={(e) => {
                  e.preventDefault();
                  onClick();
                  handlePopoverChange(false);
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
}
