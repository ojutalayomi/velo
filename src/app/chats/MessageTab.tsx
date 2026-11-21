"use client";
import {
  Check,
  CheckCheck,
  Copy,
  Ellipsis,
  Forward,
  Loader,
  TextQuote,
  Trash2,
  CircleCheck,
  CircleX,
  SmilePlus,
} from "lucide-react";
import React, { TouchEvent, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { LinkPreview } from "@/components/LinkPreview";
import { Markdown } from "@/components/Markdown";
import { renderTextWithLinks } from "@/components/RenderTextWithLinks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Statuser } from "@/components/VerificationComponent";
import { Attachment, MessageAttributes, Reaction } from "@/lib/types/type";
import { updateLiveTime } from "@/lib/utils";
import { deleteMessage, updateMessage, updateConversation } from "@/redux/chatSlice";
import { CallCard } from "@/components/CallCard";
import { PollCard } from "@/components/PollCard";
import { parseCallRecord } from "@/lib/callRecord";
import { messageText, parsePollContent } from "@/lib/polls";
import { useReactors } from "@/hooks/useReactors";
import { useAppDispatch } from "@/redux/hooks";
import { RootState } from "@/redux/store";
import {
  ADMIN_DELETED_CONTENT,
  DELETED_MARKER,
  deletedPreview,
  messageDeletion,
  SENDER_DELETED_CONTENT,
} from "@/lib/messageDeletion";
import { addSelectedMessage, removeSelectedMessage } from "@/redux/utilsSlice";

import { MediaCollage } from "./FilesView";
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
  onClick?: () => void;
  /** First bubble of a run from the same sender: gets the tail corner and extra top spacing. */
  isFirstInGroup?: boolean;
};

// Define the type for each option
type Option = {
  icon: React.ElementType; // Type for the icon component
  text: string; // Text to display
  onClick: () => void; // Click handler function
};

const MessageTab = ({ message, setQuote, onClick, isFirstInGroup = true }: Props) => {
  const dispatch = useAppDispatch();
  const { userdata } = useUser();
  const [open, setOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [options, openOptions] = useState<boolean>(false);
  const [messageContent, setMessageContent] = useState<string>(message.content.replace("≤≤≤", ""));
  const [time] = useState<string>(updateLiveTime("chat-time", message.timestamp));
  const socket = useSocket();
  const { selectedMessages } = useSelector((state: RootState) => state.utils);
  const adminIds = useSelector(
    (state: RootState) => state.chat.conversations.find((c) => c.id === message.chatId)?.adminIds
  );
  const deletion = messageDeletion({
    senderId: message?.sender?.id,
    userId: userdata._id,
    chatType: message.chatType,
    adminIds,
  });
  const [rectionInfoDisplay, setReactionInfoDisplay] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_LENGTH = 300; // Adjust this number to change when the "Read more" appears

  const senderId = message?.sender?.id || "";
  const sender = message?.sender?.name || "";
  const verified = message?.sender?.verified ?? false;
  const displayPicture = message?.sender?.displayPicture || "";

  useEffect(() => {
    setMessageContent(message.content.replace("≤≤≤", ""));
  }, [message.content]);

  // Read once every other member in the chat has a read receipt for this message.
  const readByEveryone = (() => {
    const others = Object.entries(message.isRead ?? {}).filter(([id]) => id !== senderId);
    return others.length > 0 && others.every(([, read]) => read);
  })();

  const renderStatusIcon = (status: string) => {
    if (readByEveryone && status !== "failed" && status !== "sending") {
      return <CheckCheck size={14} className="min-w-3 text-sky-500" />;
    }
    switch (status) {
      case "sending":
        return <Loader size={15} className="min-w-3  animate-spin" />;
      case "sent":
        return <Check size={14} className="min-w-3" />;
      case "delivered":
        return <CheckCheck size={14} className="min-w-3" />;
      case "failed":
        return <b className="min-w-3 text-red-600">Not sent!</b>;
      default:
        return <CheckCheck size={14} className="min-w-3 text-sky-500" />;
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
      await navigator.clipboard.writeText(messageText(message));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      openOptions(false);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Update the optionss array to use the defined type
  const IsSelected = selectedMessages.includes(String(message._id));
  const optionss: Option[] = [
    {
      icon: TextQuote,
      text: "Quote",
      onClick: () =>
        setQuote({
          message: { content: messageText(message), _id: message._id as string, senderId },
          state: true,
        }),
    },
    {
      icon: Copy,
      text: isCopied ? "Copied!" : "Copy message",
      onClick: copyToClipboard,
    },
    ...(deletion
      ? [
          {
            icon: Trash2,
            text: "Delete",
            onClick: () => {
              if (!message.content.endsWith(DELETED_MARKER)) {
                if (socket) {
                  dispatch(
                    updateConversation({
                      id: message.chatId as string,
                      updates: { lastMessage: deletedPreview(deletion === "admin" ? ADMIN_DELETED_CONTENT : SENDER_DELETED_CONTENT) },
                    })
                  );
                  dispatch(
                    updateMessage({
                      id: message._id as string,
                      updates: {
                        attachments: [],
                        content:
                          deletion === "admin" ? ADMIN_DELETED_CONTENT : SENDER_DELETED_CONTENT,
                      },
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

  const pollData = message.messageType === "Poll" ? parsePollContent(message.content) : null;
  const callRecord = message.messageType === "Call" ? parseCallRecord(message.content) : null;
  const urls = pollData || callRecord ? [] : extractUrls(messageContent);
  const firstUrl = urls[0]; // Only show preview for the first URL

  const handleTouch = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const longPressTimer = setTimeout(() => {
        dispatch(
          IsSelected
            ? removeSelectedMessage(message._id as string)
            : addSelectedMessage(message._id as string)
        );
      }, 1000);

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
      const longPressTimer = setTimeout(() => setOpen(true), 1000);
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
    if (onClick) return onClick();
    if ((e.target as HTMLElement).closest("a")) return;
    // Once selecting has started, a tap toggles the message in or out of the selection.
    if (IsSelected) dispatch(removeSelectedMessage(message._id as string));
    else if (selectedMessages.length) dispatch(addSelectedMessage(message._id as string));
  };

  if (message.messageType === "Announcement") {
    return (
      <div id={message._id as string} className="my-3 flex justify-center px-4">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-center text-xs text-gray-500 dark:bg-zinc-800 dark:text-gray-400">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <>
      <div
        id={message._id as string}
        onClick={handleClick}
        onTouchStart={handleTouch}
        // onContextMenu={handleContextMenu}
        className={`${senderId === userdata._id ? "items-end" : "items-start"} ${IsSelected && "bg-brand/20 py-2"} ${isFirstInGroup ? "mt-2" : "mt-0.5"} flex flex-col px-1 transition-colors duration-300 dark:text-gray-400`}
      >
        {/* Main Message Container */}
        <div
          className={`flex ${message.messageType !== "Markdown" ? "max-w-[85%] tablets1:max-w-[75%]" : "max-w-full"} flex-1 ${senderId === userdata._id ? "ml-auto flex-row-reverse" : "mr-auto"} relative items-end gap-1.5`}
        >
          <div
            className={`flex max-w-full flex-1 flex-col gap-1 ${senderId === userdata._id ? "items-end" : "items-start"}`}
          >
            {message.attachments.length ? (
              <MediaCollage
                media={message.attachments as (Attachment & { uploadedAt: string })[]}
              />
            ) : (
              <></>
            )}

            {/* Message Bubble */}
            <div
              className={`relative ${message.content.length > 0 ? "flex" : "hidden"} min-w-[4.5rem] max-w-full flex-col overflow-hidden rounded-lg px-2.5 pb-1 pt-1.5 shadow-sm ${
                senderId === userdata._id
                  ? `${isFirstInGroup ? "rounded-tr-none" : ""} bg-brand/15 text-gray-900 dark:bg-brand/25 dark:text-white`
                  : `${isFirstInGroup ? "rounded-tl-none" : ""} bg-white text-gray-900 dark:bg-zinc-800 dark:text-white`
              } text-left`}
              onTouchStart={handleTouch1}
              onContextMenu={handleContextMenu1}
            >
              {/* Sender name for other users */}
              {senderId !== userdata._id && message.chatType === "Group" && isFirstInGroup && (
                <div className="mb-0.5 flex items-center gap-1">
                  <span className="text-[13px] font-semibold text-brand dark:text-brand">
                    {sender}
                  </span>
                  {verified && <Statuser className="size-3.5" />}
                </div>
              )}

              {message.forwarded && (
                <div className="mb-0.5 flex items-center gap-1 text-[11px] italic text-gray-500 dark:text-gray-400">
                  <Forward className="size-3" /> Forwarded
                </div>
              )}

              {/* Quote and Link Preview */}
              {message.quotedMessageId && <QuoteComponent message={message} senderId={senderId} />}
              {firstUrl && <LinkPreview url={firstUrl} />}

              {/* Message Content */}
              <div className="">
                {/* Determine which portion of the message to display (truncated or full) */}
                {(() => {
                  const contentToDisplay =
                    messageContent.length > MAX_LENGTH && !isExpanded
                      ? messageContent.slice(0, MAX_LENGTH) + "..."
                      : messageContent;

                  if (callRecord) {
                    return (
                      <CallCard
                        record={callRecord}
                        viewerId={String(userdata._id)}
                        isGroup={message.chatType === "Group"}
                      />
                    );
                  }

                  if (pollData) {
                    return (
                      <PollCard
                        targetType="message"
                        targetId={String(message._id)}
                        poll={pollData}
                        className="min-w-[220px]"
                      />
                    );
                  }

                  return (
                    <>
                      {message.messageType === "Markdown" ? (
                        <div
                          // className={`prose prose-sm max-w-none dark:prose-invert ${senderId === userdata._id ? "text-white" : ""}`}
                          className="prose prose-sm max-w-none dark:prose-invert"
                        >
                          <Markdown
                            mentionUsernames={[
                              ...(message.mentions ?? []).map((m) => m.username),
                              ...(message.chatType === "Group" ? ["ai"] : []),
                            ]}
                          >
                            {contentToDisplay}
                          </Markdown>
                        </div>
                      ) : (
                        <p
                          className="whitespace-pre-wrap break-words text-[15px] leading-snug"
                          style={{ fontFamily: "inherit" }}
                        >
                          {renderTextWithLinks(
                            contentToDisplay,
                            [
                              ...(message.mentions ?? []).map((m) => m.username),
                              ...(message.chatType === "Group" ? ["ai"] : []),
                            ]
                          )}
                        </p>
                      )}

                      {/* Show the "Read more/less" button if the original message is long */}
                      {messageContent.length > MAX_LENGTH && (
                        <Button
                          variant="link"
                          onClick={() => setIsExpanded(!isExpanded)}
                          className={`mt-1 h-auto p-0 text-sm ${
                            "text-brand"
                          } hover:underline`}
                        >
                          {isExpanded ? "Read less" : "Read more"}
                        </Button>
                      )}
                    </>
                  );
                })()}
              </div>

              <div
                className={`-mb-0.5 mt-0.5 flex items-center justify-end gap-1 text-nowrap text-[11px] leading-none ${
                  "text-gray-500 dark:text-gray-400"
                }`}
              >
                <span>{time}</span>
                {senderId === userdata._id && renderStatusIcon(message.status)}
              </div>
            </div>
          </div>

          {/* Message Options */}
          {message.messageType !== "Markdown" && (
            <OptionsComponent options={optionss} open={open} setOpen={setOpen} />
          )}
        </div>

        {/* Message Footer */}

        {/* Reactions */}
        <ReactionSection
          message={message}
          senderId={senderId}
          setReactionInfoDisplay={setReactionInfoDisplay}
        />

        {message.messageType === "Markdown" && (
          <OptionsComponent options={optionss} open={open} setOpen={setOpen} />
        )}
      </div>
      {rectionInfoDisplay && (
        <ReactionsInfo message={message} setReactionInfoDisplay={setReactionInfoDisplay} />
      )}
    </>
  );
};

MessageTab.displayName = "MessageTab";
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
  const resolveUser = useReactors(
    message.reactions.map((r) => r.userId),
    false
  );

  const reactionArray: Reaction[] = [];

  if (message.reactions.length === 0) return null;

  return (
    <div
      className="z-10 -mt-3 flex flex-wrap items-center gap-1 rounded-full border bg-white px-1 py-0.5 dark:border-gray-200 dark:bg-zinc-800"
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
          acc.push(
            <span
              key={index}
              title={message.reactions
                .filter((r) => r.reaction === reaction.reaction)
                .map((r) =>
                  r.userId === userdata._id ? "You" : (resolveUser(r.userId)?.name ?? "Someone")
                )
                .join(", ")}
              className="cursor-pointer text-xs"
            >
              {reaction.reaction}
              {reactionCount > 1 && <sub className="ml-0.5 text-xs">{reactionCount}</sub>}
            </span>
          );
        }
        return acc;
      }, [])}
      {reactionArray.length > 5 && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            senderId === userdata._id ? "bg-white/10" : "bg-gray-200 dark:bg-zinc-700"
          }`}
        >
          +{reactionArray.length - 5}
        </span>
      )}
    </div>
  );
};

ReactionSection.displayName = "ReactionSection";

const QuoteComponent = ({ message, senderId }: { message: MessageAttributes; senderId: string }) => {
  const { userdata } = useUser();
  const messages = useSelector((state: RootState) => state.chat.messages);

  const Messages = messages?.filter((msg) => {
    return msg.chatId === message.chatId;
  });

  const quotedMessageId = Messages?.find((m) => (m._id as string) === message.quotedMessageId);

  const handleQuoteClick = () => {
    const messageElement = document.getElementById(message.quotedMessageId as string);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth" });
      // Add a brief highlight effect
      messageElement.classList.add("bg-brand/20");
      messageElement.classList.add("py-2");
      setTimeout(() => {
        messageElement.classList.remove("bg-brand/20");
        messageElement.classList.remove("py-2");
      }, 2000);
    }
  };

  if (!quotedMessageId) return null;

  const quotedText = messageText(quotedMessageId);
  if (quotedText.length === 0) return null;

  return (
    <div
      className={`flex ${senderId === userdata._id ? "flex-row-reverse" : "mt-2"}`}
      onClick={handleQuoteClick}
    >
      <div
        className={`
          flex w-full max-w-full cursor-pointer items-center gap-2 rounded-lg p-2
          ${
            senderId === userdata._id
              ? "bg-black/5 dark:bg-white/10"
              : "bg-black/5 dark:bg-white/10"
          }
          border-l-4 ${senderId === userdata._id ? "border-brand" : "border-gray-400"}
          transition-all hover:bg-opacity-80
        `}
      >
        <div className="flex max-w-full flex-col overflow-auto">
          <span
            className={`text-xs font-medium ${senderId === userdata._id ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"}`}
          >
            {quotedMessageId?.sender?.name || ""}
          </span>
          <span
            className={`line-clamp-2 text-xs ${senderId === userdata._id ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-400"}`}
          >
            {quotedText}
          </span>
        </div>
      </div>
    </div>
  );
};

QuoteComponent.displayName = "QuoteComponent";

const OptionsComponent = ({
  options,
  open,
  setOpen,
}: {
  options: Option[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}) => {
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
                className="flex w-full items-center gap-3 rounded px-2 py-3 hover:bg-gray-100 dark:hover:bg-zinc-700"
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
          className="hidden w-auto min-w-[160px] rounded-md bg-white p-1 shadow-lg tablets:block dark:bg-zinc-800"
          align="end"
          sideOffset={5}
        >
          <div className="flex flex-col">
            {options.map(({ icon: Icon, text, onClick }, index) => (
              <button
                key={index}
                type="button"
                className="flex items-center gap-2 rounded p-2 hover:bg-gray-100 dark:hover:bg-zinc-700"
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
};

OptionsComponent.displayName = "OptionsComponent";