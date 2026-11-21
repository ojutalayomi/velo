"use client";
import { Ellipsis, Info, MessageSquareText, Pin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useMediaQuery } from "usehooks-ts";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DeleteChatDialog from "@/components/DeleteChatDialog";
import { Statuser } from "@/components/VerificationComponent";
import { ConvoType } from "@/lib/types/type";
import { updateLiveTime } from "@/lib/utils";
import { lastMessagePreview } from "@/lib/polls";
import { chatDraftKey, useDraftValue } from "@/hooks/useDraft";
import { typingLabel } from "./TypingIndicator";
import { updateConversation, deleteConversation } from "@/redux/chatSlice";
import { useAppDispatch } from "@/redux/hooks";
import { RootState } from "@/redux/store";

type FilteredChatsProps = {
  filteredChats: () => Array<ConvoType>;
  className?: string;
  className1?: string;
};

interface Props {
  chat: ConvoType;
}

/** Where a chat lives; its settings page sits under it (not available for "message yourself"). */
const chatHref = (chat: ConvoType) =>
  chat.type === "Group"
    ? `/chats/group/${chat.id}`
    : chat.type === "Personal"
      ? "/chats/me"
      : `/chats/${chat.id}`;

/** Profile card shown when the avatar in the chat list is tapped. */
const ChatProfileDialog: React.FC<{
  chat: ConvoType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ chat, open, onOpenChange }) => {
  const router = useRouter();
  const isGroup = chat.type === "Group";
  const isPersonal = chat.type === "Personal";
  const subtitle = isGroup
    ? `Group · ${chat.participants.length} ${chat.participants.length === 1 ? "member" : "members"}`
    : isPersonal
      ? "Your own space"
      : "Direct message";

  const go = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  const actions = [
    { label: "Message", Icon: MessageSquareText, path: chatHref(chat) },
    ...(isPersonal ? [] : [{ label: "Info", Icon: Info, path: `${chatHref(chat)}/settings` }]),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-xs gap-0 overflow-hidden rounded-3xl border-none p-0 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-brand/20 to-transparent px-6 pb-4 pt-10">
          <Avatar className="size-44 shadow-lg ring-4 ring-white dark:ring-zinc-900">
            <AvatarImage
              src={chat.displayPicture}
              alt={chat.name}
              className="size-full rounded-full object-cover"
            />
            <AvatarFallback className="text-5xl capitalize">{chat.name?.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-center gap-0.5 text-center">
            <DialogTitle className="flex items-center gap-1 text-xl">
              <span className="break-words">{chat.name}</span>
              {chat.verified && <Statuser className="size-4 flex-shrink-0" />}
            </DialogTitle>
            <DialogDescription className="text-sm">{subtitle}</DialogDescription>
          </div>
          {isGroup && chat.description && (
            <p className="line-clamp-3 text-center text-sm text-gray-600 dark:text-gray-400">
              {chat.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-8 px-6 pb-6 pt-2">
          {actions.map(({ label, Icon, path }) => (
            <button
              key={label}
              type="button"
              onClick={() => go(path)}
              className="group flex flex-col items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-brand text-white shadow-sm transition-transform group-hover:scale-105 group-active:scale-95">
                <Icon className="size-5" />
              </span>
              {label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Card: React.FC<Props> = ({ chat }) => {
  const [time, setTime] = useState<string>();
  const { onlineUsers } = useSelector((state: RootState) => state.utils);
  const socket = useSocket();
  const [isPinned, setIsPinned] = useState(chat?.pinned);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isArchived, setIsArchived] = useState(chat?.archived);
  const [isHidden, setIsHidden] = useState(false);
  const [isUnread, setIsUnread] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const { userdata } = useUser();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [showFullscreen, setShowFullscreen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const timeDifference = Date.now() - Date.parse(chat.lastUpdated);
      if (timeDifference > 86400 * 1000) {
        const today = new Date();
        const lastUpdatedDate = new Date(chat.lastUpdated);
        if (today.toISOString().split("T")[0] !== lastUpdatedDate.toISOString().split("T")[0]) {
          if (today.getDate() - lastUpdatedDate.getDate() === 1) {
            setTime("Yesterday.");
          } else {
            const date = lastUpdatedDate.toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            setTime(date);
          }
        }
      } else {
        setTime(updateLiveTime("chat-time", chat.lastUpdated));
      }
    };
    updateTimer();
  }, [chat.lastUpdated]);

  const options = [
    {
      id: 1,
      name: isPinned ? "Unpin" : "Pin",
      action: () => dispatch(updateConversation({ id: chat.id, updates: { pinned: !isPinned } })),
    },
    {
      id: 2,
      name: "Delete",
      action: () => {
        dispatch(deleteConversation(chat.id));
        router.replace("/chats");
      },
    },
    {
      id: 3,
      name: isArchived ? "Unarchive" : "Archive",
      action: () =>
        dispatch(updateConversation({ id: chat.id, updates: { archived: !isArchived } })),
    },
    { id: 4, name: isHidden ? "Unhide" : "Hide", action: () => setIsHidden(!isHidden) },
    {
      id: 5,
      name: isUnread ? "Mark as read" : "Mark as unread",
      action: () => setIsUnread(!isUnread),
    },
    { id: 6, name: isBlocked ? "Unblock" : "Block", action: () => setIsBlocked(!isBlocked) },
  ] as const;

  const handleOption = (option: (typeof options)[number]) => {
    // Deleting removes the chat on the server for everyone in it, so it needs a confirmation
    // first; the dialog does the deleting and updates the list when the server agrees.
    if (option.name === "Delete") {
      setDeleteOpen(true);
      return;
    }
    if (socket) {
      option.action();
      switch (true) {
        case option.name.toLowerCase().includes("pin"):
          socket.emit("updateConversation", {
            id: chat.id,
            updates: { pinned: !isPinned, userId: userdata._id },
          });
          setIsPinned(!isPinned);
          break;
        case option.name.toLowerCase().includes("archive"):
          socket.emit("updateConversation", {
            id: chat.id,
            updates: { archived: !isArchived, userId: userdata._id },
          });
          setIsArchived(!isArchived);
          break;
        case option.name.toLowerCase().includes("read"):
          {
            const unread = isUnread ? 1 : 0;
            socket.emit("updateConversation", {
              id: chat.id,
              updates: { unreadCount: unread, userId: userdata._id },
            });
          }
          setIsUnread(!isUnread);
          break;
        default:
          break;
      }
    }
  };

  const fullscreen = () => {
    setShowFullscreen(true);
  };

  const filteredIsTypingList = chat?.isTypingList.filter((i) => i.chatId === chat.id);
  const draft = useDraftValue(chatDraftKey(chat.id));

  // Handlers for long-press (mobile), right-click (desktop), and ellipsis click
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isMobile) {
      setDropdownOpen(true);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMobile) {
      longPressTimeout.current = setTimeout(() => {
        setDrawerOpen(true);
      }, 1000);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isMobile && longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const handleEllipsisClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropdownOpen(true);
  };

  return (
    <>
      <Link
        key={chat.id}
        href={chatHref(chat)}
      >
        <div
          className="group relative flex cursor-pointer items-center gap-3 overflow-visible rounded-lg bg-white p-3 shadow-bar transition-colors duration-150 hover:bg-slate-200 tablets1:duration-300 dark:bg-zinc-900 dark:text-white dark:shadow-bar-dark hover:dark:bg-zinc-700"
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Dropdown/Drawer menu button */}
          {/* Always render dropdown, but only open when dropdownOpen is true */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="pointer-events-none absolute right-0 mr-4 overflow-hidden rounded-full border-2 border-zinc-200 bg-white p-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 dark:border-zinc-900 dark:bg-black"
                onClick={handleEllipsisClick}
              >
                <Ellipsis className="size-6" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {options.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleOption(option);
                    setDropdownOpen(false);
                  }}
                >
                  {option.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Only render drawer on mobile, open on long-press */}
          {isMobile && (
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <span className="hidden"> {/* No visible trigger, open via long-press */}</span>
              </DrawerTrigger>
              <DrawerContent aria-describedby="Options" aria-labelledby="Options">
                <DrawerHeader className="hidden text-left">
                  <DrawerTitle className="text-left">Options</DrawerTitle>
                  <DrawerDescription className="text-left">Options</DrawerDescription>
                </DrawerHeader>
                <ul className="flex flex-col space-y-2 p-4">
                  {options.map((option) => (
                    <li
                      key={option.id}
                      className="w-full cursor-pointer rounded px-3 py-2 text-left hover:bg-muted"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOption(option);
                        setDrawerOpen(false);
                      }}
                    >
                      {option.name}
                    </li>
                  ))}
                </ul>
              </DrawerContent>
            </Drawer>
          )}
          {/* Avatar and chat info */}
          <div className="relative">
            <Avatar
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fullscreen();
              }}
            >
              <AvatarFallback>{(chat.name ?? "????").slice(0, 2)}</AvatarFallback>
              <AvatarImage
                src={chat.displayPicture}
                height={40}
                width={40}
                alt={chat.name}
                className="size-10 min-w-10 rounded-full"
              />
            </Avatar>
            {chat.type === "DM" &&
              onlineUsers.includes(
                chat.participants.find((id) => id !== userdata._id) as string
              ) && (
                <div className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-green-500" />
              )}
          </div>
          <div className="w-1/4 flex-grow">
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-1">
                <h2 className="truncate font-semibold">
                  {chat.name + (chat.type === "Personal" ? " (You)" : "")}
                </h2>
                {chat.verified && <Statuser className="size-4 flex-shrink-0" />}
              </div>
            </div>
            <p className="truncate text-sm text-gray-600">
              {filteredIsTypingList?.length > 0
                ? typingLabel(filteredIsTypingList)
                : draft
                  ? (
                      <>
                        <span className="text-brand">Draft: </span>
                        {draft}
                      </>
                    )
                  : lastMessagePreview(chat.lastMessage)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-nowrap text-sm text-gray-500 group-hover:hidden">{time}</span>
            <div className="flex items-center gap-2">
              {chat.unread > 0 && (
                <div className="flex size-5 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {chat.unread}
                </div>
              )}
              {chat.pinned && (
                <Pin
                  size={21}
                  className={`cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (socket) {
                      socket.emit("updateConversation", {
                        id: chat.id,
                        updates: { pinned: !isPinned, userId: userdata._id },
                      });
                      dispatch(
                        updateConversation({ id: chat.id, updates: { pinned: !chat.pinned } })
                      );
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </Link>
      {/* Outside the Link: clicks inside a portaled dialog bubble up through React and would navigate. */}
      <ChatProfileDialog chat={chat} open={showFullscreen} onOpenChange={setShowFullscreen} />
      <DeleteChatDialog
        chatId={chat.id}
        name={chat.name}
        kind={chat.type === "Group" ? "group" : chat.type === "Personal" ? "personal" : "direct"}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => dispatch(deleteConversation(chat.id))}
      />
    </>
  );
};

const ChatListPage: React.FC<FilteredChatsProps> = ({
  filteredChats,
  className = "overflow-auto p-4 pt-2",
  className1 = "mb-10",
}) => {
  return (
    <div className={`h-full flex-grow ${className}`}>
      <div className={`flex flex-col gap-2 ${className1} tablets1:mb-0`}>
        {filteredChats()
          .sort((a, b) => {
            // First sort by pinned status
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            // Then sort by lastUpdated time for chats with same pinned status
            return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
          })
          .map((chat, index) => (
            <Card key={index} chat={chat} />
          ))}
      </div>
    </div>
  );
};

export default ChatListPage;
