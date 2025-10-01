"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/providers/UserProvider";
import { useSelector } from "react-redux";
import { showChat } from "@/redux/navigationSlice";
import { RootState } from "@/redux/store";
import { useAppDispatch } from "@/redux/hooks";
import { updateLiveTime, updateConversation, deleteConversation } from "@/redux/chatSlice";
import { ConvoType, MessageAttributes, NewChatSettings } from "@/lib/types/type";
import { Pin } from "lucide-react";
import { useSocket } from "@/app/providers/SocketProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Statuser } from "@/components/VerificationComponent";
import Link from "next/link";
import { useMediaQuery } from "usehooks-ts";
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
import { Ellipsis } from "lucide-react";

type FilteredChatsProps = {
  filteredChats: () => Array<ConvoType>;
  className?: string;
  className1?: string;
};

interface Props {
  chat: ConvoType;
}

interface ChatSetting {
  [x: string]: NewChatSettings;
}

interface CHT {
  messages: MessageAttributes[];
  settings: ChatSetting;
  conversations: ConvoType[];
  loading: boolean;
  isOnline: boolean;
}

const Card: React.FC<Props> = ({ chat }) => {
  const [time, setTime] = useState<string>();
  const { onlineUsers } = useSelector((state: RootState) => state.utils);
  const socket = useSocket();
  const [isPinned, setIsPinned] = useState(chat?.pinned);
  const [isDeleted, setIsDeleted] = useState(chat?.deleted);
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
        case option.name.toLowerCase().includes("delete"):
          socket.emit("updateConversation", {
            id: chat.id,
            updates: { deleted: true, convo: true },
          });
          setIsDeleted(true);
          break;
        case option.name.toLowerCase().includes("read"):
          const unread = isUnread ? 1 : 0;
          socket.emit("updateConversation", {
            id: chat.id,
            updates: { unreadCount: unread, userId: userdata._id },
          });
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
      }, 500);
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
    <Link
      key={chat.id}
      href={
        chat.type === "Groups"
          ? `/chats/group/${chat.id}`
          : chat.type === "Personal"
            ? `/chats/me`
            : `/chats/${chat.id}`
      }
    >
      <div
        className="group bg-white dark:bg-zinc-900 dark:text-white hover:bg-slate-200 hover:dark:bg-zinc-700 p-3 cursor-pointer rounded-lg shadow-bar dark:shadow-bar-dark flex items-center gap-3 overflow-visible transition-colors duration-150 tablets1:duration-300 relative"
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Dropdown/Drawer menu button */}
        {/* Always render dropdown, but only open when dropdownOpen is true */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="absolute right-0 mr-4 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto rounded-full p-1 border-2 bg-white dark:bg-black border-zinc-200 dark:border-zinc-900 overflow-hidden transition-opacity"
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
              <DrawerHeader className="text-left hidden">
                <DrawerTitle className="text-left">Options</DrawerTitle>
                <DrawerDescription className="text-left">Options</DrawerDescription>
              </DrawerHeader>
              <ul className="flex flex-col p-4 space-y-2">
                {options.map((option) => (
                  <li
                    key={option.id}
                    className="w-full text-left py-2 px-3 rounded hover:bg-muted cursor-pointer"
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
          <Avatar>
            <AvatarFallback>{(chat.name ?? "????").slice(0, 2)}</AvatarFallback>
            <AvatarImage
              src={chat.displayPicture}
              onClick={(e) => {
                e.preventDefault();
                fullscreen();
              }}
              height={40}
              width={40}
              alt={chat.name}
              className="w-10 h-10 min-w-10 rounded-full"
            />
          </Avatar>
          {chat.type === "DMs" &&
            onlineUsers.includes(chat.participants.find((id) => id !== userdata._id) as string) && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            )}
        </div>
        <div className="flex-grow w-1/4">
          <div className="flex justify-between items-baseline">
            <div className="flex items-center gap-1">
              <h2 className="font-semibold truncate">
                {chat.name + (chat.type === "Personal" ? " (You)" : "")}
              </h2>
              {chat.verified && <Statuser className="size-4 flex-shrink-0" />}
            </div>
          </div>
          <p className="text-sm text-gray-600 truncate">
            {filteredIsTypingList?.length > 0
              ? chat.type === "DMs"
                ? filteredIsTypingList.map((i) => i.name).join(", ") + " " + "is" + " typing..."
                : filteredIsTypingList.map((i) => i.name).join(", ") +
                  " " +
                  (filteredIsTypingList.length > 1 ? "are" : "is") +
                  " typing..."
              : chat.lastMessage}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="group-hover:hidden text-sm text-gray-500 text-nowrap">{time}</span>
          <div className="flex items-center gap-2">
            {chat.unread > 0 && (
              <div className="bg-brand text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {chat.unread}
              </div>
            )}
            {chat.pinned && (
              <Pin
                size={21}
                className={`text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out`}
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
        {showFullscreen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowFullscreen(false)}
          >
            <Image
              src={
                chat.displayPicture
                  ? chat.displayPicture.includes("ila-")
                    ? "/default.jpeg"
                    : chat.displayPicture
                  : "/default.jpeg"
              }
              height={500}
              width={500}
              alt={chat.name}
              className="max-h-[90vh] w-auto object-contain rounded-lg"
            />
          </div>
        )}
      </div>
    </Link>
  );
};

const ChatListPage: React.FC<FilteredChatsProps> = ({
  filteredChats,
  className = "overflow-auto p-4 pt-2",
  className1 = "mb-10",
}) => {
  return (
    <div className={`flex-grow h-full ${className}`}>
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
