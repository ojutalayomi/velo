"use client";
import {
  Check,
  CheckCheck,
  Copy,
  Ellipsis,
  Forward,
  Loader,
  TextQuote,
  Reply,
  Trash2,
  CircleCheck,
  CircleX,
  SmilePlus,
  Ban,
  Plus,
  Pin,
  PinOff,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { canPinMessages, pinBlockReason } from "@/lib/pinRules";
import React, { TouchEvent, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import ForwardDialog from "@/components/ForwardDialog";
import { LinkPreview } from "@/components/LinkPreview";
import { resolveSender } from "@/lib/senderProfile";
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
import { Attachment, MessageAttributes } from "@/lib/types/type";
import { groupReactions, visibleReactions } from "@/lib/reactions";
import { cn, updateLiveTime } from "@/lib/utils";
import { deleteMessage, updateMessage, updateConversation } from "@/redux/chatSlice";
import { CallCard } from "@/components/CallCard";
import { PollCard } from "@/components/PollCard";
import { ContactCard } from "@/components/chat/ContactCard";
import { StatusReplyCard } from "@/components/chat/StatusReplyCard";
import { LinkMessage } from "@/components/chat/LinkMessage";
import { GifMessage } from "@/components/chat/GifMessage";
import { LocationCard } from "@/components/chat/LocationCard";
import { parseContactContent, parseLocationContent } from "@/lib/chatShare";
import { parseKlipyContent } from "@/lib/klipy";
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

import { useSwipeToReply } from "@/hooks/useSwipeToReply";
import { canForward, canQuote } from "@/lib/messageActions";

import { ViewOnceBubble } from "@/components/chat/ViewOnce";
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
  const pins = useSelector(
    (state: RootState) => state.chat.conversations.find((c) => c.id === message.chatId)?.pinnedMessages
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

  // Who sent it is shown from the chat's current member profiles, so a rename or new photo
  // applies to old messages too; the copy that came with the message is only a fallback.
  const profiles = useSelector(
    (state: RootState) => state.chat.conversations.find((c) => c.id === message.chatId)?.profiles
  );
  const shownSender = resolveSender(message?.sender, profiles);
  const senderId = message?.sender?.id || "";
  const sender = shownSender?.name || "";
  const verified = shownSender?.verified ?? false;
  const displayPicture = shownSender?.displayPicture || "";

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
  const [forwardOpen, setForwardOpen] = useState(false);
  const quoteMessage = () =>
    setQuote({
      message: { content: messageText(message), _id: message._id as string, senderId },
      state: true,
    });
  const quotable = canQuote(message);
  // Swipe right to quote on touch screens, except while a selection is in progress.
  const { rowRef, iconRef } = useSwipeToReply({
    enabled: quotable && selectedMessages.length === 0,
    onTrigger: quoteMessage,
  });
  const isPinned = Boolean(pins?.some((p) => p.messageId === String(message._id)));
  const pinAllowed =
    Boolean(socket) &&
    !message.content.endsWith(DELETED_MARKER) &&
    canPinMessages({ chatType: message.chatType, adminIds, userId: userdata._id });
  const togglePin = () => {
    openOptions(false);
    setOpen(false);
    const blocked = pinBlockReason({
      isPinned,
      pinCount: pins?.length ?? 0,
      deleted: message.content.endsWith(DELETED_MARKER),
    });
    if (blocked) {
      toast.error(blocked);
      return;
    }
    socket?.emit(
      isPinned ? "unpinMessage" : "pinMessage",
      { chatId: message.chatId, messageId: String(message._id) },
      (res?: { ok: boolean; error?: string }) => {
        if (res && !res.ok) toast.error(res.error || "Couldn't update pins");
      }
    );
  };
  const optionss: Option[] = [
    ...(quotable ? [{ icon: TextQuote, text: "Quote", onClick: quoteMessage }] : []),
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
    ...(pinAllowed
      ? [
          {
            icon: isPinned ? PinOff : Pin,
            text: isPinned ? "Unpin" : "Pin",
            onClick: togglePin,
          },
        ]
      : []),
    ...(!canForward(message)
      ? []
      : [
          {
            icon: Forward,
            text: "Forward",
            onClick: () => {
              openOptions(false);
              setForwardOpen(true);
            },
          },
        ]),
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
  const locationData = message.messageType === "Location" ? parseLocationContent(message.content) : null;
  const contactData = message.messageType === "Contact" ? parseContactContent(message.content) : null;
  const isGifType = message.messageType === "AnimatedGIF" || message.messageType === "Sticker";
  const gifData = isGifType ? parseKlipyContent(message.content) : null;
  const isLinkMessage = message.messageType === "Link";
  // A link-only message gets its own card instead of a preview above the text.
  const urls = pollData || callRecord || isLinkMessage || locationData || contactData || gifData ? [] : extractUrls(messageContent);
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
        ref={rowRef}
        id={message._id as string}
        onClick={handleClick}
        onTouchStart={handleTouch}
        // onContextMenu={handleContextMenu}
        className={`${senderId === userdata._id ? "items-end" : "items-start"} ${IsSelected && "bg-brand/20 py-2"} ${isFirstInGroup ? "mt-2" : "mt-0.5"} relative flex flex-col px-1 transition-colors duration-300 dark:text-gray-400`}
      >
        {/* Revealed from the left while the message is swiped right (see useSwipeToReply). */}
        {quotable && (
          <span
            ref={iconRef}
            aria-hidden
            className="pointer-events-none absolute -left-10 top-1/2 flex size-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 opacity-0 dark:bg-zinc-700 dark:text-gray-200"
            style={{ transform: "translateY(-50%) scale(0.6)" }}
          >
            <Reply size={16} />
          </span>
        )}
        {/* Main Message Container */}
        <div
          className={`flex ${message.messageType !== "Markdown" ? "max-w-[85%] tablets1:max-w-[75%]" : "max-w-full"} flex-1 ${senderId === userdata._id ? "ml-auto flex-row-reverse" : "mr-auto"} relative items-end gap-1.5`}
        >
          <div
            className={`flex max-w-full flex-1 flex-col gap-1 ${senderId === userdata._id ? "items-end" : "items-start"}`}
          >
            {/* The bubble that normally carries the sender's name is hidden for attachment-only
                messages, so the name goes above the attachment instead. */}
            {(message.attachments.length > 0 || message.viewOnce) &&
              message.content.length === 0 &&
              senderId !== userdata._id &&
              message.chatType === "Group" &&
              isFirstInGroup && (
                <div className="flex items-center gap-1 px-1">
                  <span className="text-[13px] font-semibold text-brand dark:text-brand">{sender}</span>
                  {verified && <Statuser className="size-3.5" />}
                </div>
              )}
            {message.viewOnce ? (
              <ViewOnceBubble
                message={message}
                userId={userdata._id}
                senderId={senderId}
                time={time}
                statusIcon={senderId === userdata._id ? renderStatusIcon(message.status) : undefined}
              />
            ) : message.attachments.length ? (
              <MediaCollage
                voiceNote={message.messageType === "VoiceNote"}
                media={message.attachments as (Attachment & { uploadedAt: string })[]}
              />
            ) : (
              <></>
            )}

            {/* The bubble below is hidden when there is no text, which would also hide the time and
                the sent/read ticks of an attachment-only message. */}
            {message.attachments.length > 0 && message.content.length === 0 && (
              <div className="flex items-center justify-end gap-1 px-1 text-[11px] leading-none text-gray-500 dark:text-gray-400">
                <span>{time}</span>
                {senderId === userdata._id && renderStatusIcon(message.status)}
              </div>
            )}

            {/* Message Bubble */}
            <div
              className={`relative ${message.content.length > 0 ? "flex" : "hidden"} min-w-18 max-w-full flex-col overflow-hidden rounded-lg px-2.5 pb-1 pt-1.5 ${
                message.messageType === "Sticker"
                  ? "bg-transparent text-gray-900 dark:text-white"
                  : `shadow ${
                      senderId === userdata._id
                        ? `${isFirstInGroup ? "rounded-tr-none" : ""} bg-brand/15 text-gray-900 dark:bg-brand/25 dark:text-white`
                        : `${isFirstInGroup ? "rounded-tl-none" : ""} bg-white text-gray-900 dark:bg-zinc-800 dark:text-white`
                    }`
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

              {/* The status this replies to */}
              {message.statusReply && (
                <StatusReplyCard
                  reply={message.statusReply}
                  myId={userdata._id}
                  own={senderId === userdata._id}
                />
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

                  if (gifData) return <GifMessage item={gifData} sticker={message.messageType === "Sticker"} />;
                  if (locationData) return <LocationCard location={locationData} />;
                  if (contactData) return <ContactCard contact={contactData} />;

                  if (isLinkMessage) {
                    return <LinkMessage url={messageContent.trim()} own={senderId === userdata._id} />;
                  }

                  if (callRecord) {
                    return (
                      <CallCard
                        record={callRecord}
                        viewerId={String(userdata._id)}
                        isGroup={message.chatType === "Group"}
                        chatId={String(message.chatId)}
                        receiverId={String(message.receiverId)}
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
                          className={`whitespace-pre-wrap wrap-break-word text-[15px] leading-snug ${message.content.endsWith(DELETED_MARKER) ? "flex items-center" : ""}`}
                          style={{ fontFamily: "inherit" }}
                        >
                          {message.content.endsWith(DELETED_MARKER) && <Ban className="size-4 mr-1" />}
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
      {forwardOpen && (
        <ForwardDialog
          messageIds={[String(message._id)]}
          open={forwardOpen}
          onOpenChange={setForwardOpen}
          onForwarded={() => setForwardOpen(false)}
        />
      )}
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

  if (message.reactions.length === 0) return null;

  const { shown, hidden } = visibleReactions(groupReactions(message.reactions, userdata._id));
  const fromMe = senderId === userdata._id;

  return (
    <div
      className={`relative z-10 -mt-2.5 flex flex-wrap items-center gap-1 px-1 ${fromMe ? "justify-end" : "justify-start"}`}
    >
      {shown.map((group) => {
        const names = group.userIds.map((id) =>
          id === userdata._id ? "You" : (resolveUser(id)?.name ?? "Someone")
        );
        return (
          <button
            key={group.emoji}
            type="button"
            title={names.join(", ")}
            aria-label={`${group.emoji} ${group.count} ${group.count === 1 ? "reaction" : "reactions"}${group.mine ? ", including yours" : ""}`}
            onClick={() => setReactionInfoDisplay(true)}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full border px-1.5 text-sm leading-none shadow-xs transition-transform active:scale-95",
              group.mine
                ? "border-brand/60 bg-brand/10 text-brand dark:bg-brand/20"
                : "border-gray-200 bg-white text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-200"
            )}
          >
            <span className="text-[15px]">{group.emoji}</span>
            {group.count > 1 && (
              <span className="text-[11px] font-semibold tabular-nums">{group.count}</span>
            )}
          </button>
        );
      })}
      {hidden > 0 && (
        <button
          type="button"
          aria-label={`${hidden} more ${hidden === 1 ? "reaction" : "reactions"}`}
          onClick={() => setReactionInfoDisplay(true)}
          className="inline-flex h-6 items-center gap-0.5 rounded-full border border-gray-200 bg-white px-1.5 text-[11px] font-semibold text-gray-600 shadow-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-300"
        >
          <Plus size={11} strokeWidth={3} />
          {hidden}
        </button>
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
  const profiles = useSelector(
    (state: RootState) => state.chat.conversations.find((c) => c.id === message.chatId)?.profiles
  );

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
            {resolveSender(quotedMessageId?.sender, profiles)?.name || ""}
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