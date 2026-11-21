/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ChevronDown, EllipsisVertical, Loader2, MessageSquare } from "lucide-react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import React, { Fragment, JSX, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { CallButton, CallStatus, IncomingCall } from "@/components/call";
import DeleteChatDialog from "@/components/DeleteChatDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Statuser } from "@/components/VerificationComponent";
import { toast } from "sonner";
import { useCallManager } from "@/hooks/useCallManager";
import { useGlobalFileStorage } from "@/hooks/useFileStorage";
import { axiosApi } from "@/lib/api";
import { ChatMessage } from "@/lib/class/ChatMessage";
import { Attachment, ChatType, MessageAttributes, MessageType, msgStatus } from "@/lib/types/type";
import { UserData } from "@/lib/types/user";
import { generateObjectId, timeFormatter, updateLiveTime } from "@/lib/utils";
import {
  ConvoType,
  updateConversation,
  addMessage,
  updateMessage,
  deleteConversation,
  deleteMessage,
  fetchMoreChatMessages,
} from "@/redux/chatSlice";
import { useAppDispatch } from "@/redux/hooks";
import { showChat } from "@/redux/navigationSlice";
import { RootState } from "@/redux/store";
import { clearSelectedMessages } from "@/redux/utilsSlice";

import { lastMessagePreview } from "@/lib/polls";
import { chatDraftKey, useDraft } from "@/hooks/useDraft";
import { TypingBubble } from "../TypingIndicator";
import ChatTextarea from "../ChatTextarea";
import { DateGroup, getDayKey } from "@/app/chats/DateDivider";
import { DELETED_MARKER } from "@/lib/messageDeletion";
import MessageTab from "../MessageTab";
import { MultiSelect } from "../MultiSelect";

type Message = {
  _id: string;
  senderId: string;
  content: string;
};

type QuoteProp = {
  message: Message;
  state: boolean | undefined;
};

const initialQuoteState = {
  message: {
    _id: "",
    senderId: "",
    content: "",
  },
  state: false,
};

const ChatPage = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { userdata } = useUser();
  const {
    messages,
    conversations,
    loading: convoLoading,
  } = useSelector((state: RootState) => state.chat);
  const messagesHasMore = useSelector((state: RootState) => state.chat.messagesHasMore);
  const loadingMoreMessages = useSelector((state: RootState) => state.chat.loadingMoreMessages);
  const { onlineUsers } = useSelector((state: RootState) => state.utils);
  const { settings: userSettings } = useSelector((state: RootState) => state.user);
  const [quote, setQuote] = useState<QuoteProp>(initialQuoteState);
  const [time, setTime] = useState("");
  const [load, setLoading] = useState<boolean>();
  const [err, setError] = useState<boolean>();
  const [otherPerson, setOtherPerson] = useState<UserData>({} as UserData);
  const pid =
    params?.id === "me"
      ? (conversations.find((c) => c.type === "Personal")?.id as string)
      : (params?.id as string);
  const [newMessage, setNewMessage] = useDraft(chatDraftKey(pid ?? ""));
  const socket = useSocket();
  const callHooks = useCallManager(socket!) || null;
  const convo = conversations?.find((c) => c.id === pid) as ConvoType;
  const [isPinned, setIsPinned] = useState(convo?.pinned);
  const [isArchived, setIsArchived] = useState(convo?.archived);
  const [searchBarOpen, openSearchBar] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchParams = useSearchParams();
  const friendId = convo?.participants?.find((id: string) => id !== userdata._id) as string;
  const { chaT } = useSelector((state: RootState) => state.navigation);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingEmitRef = useRef(0);
  const messageBoxRef = useRef<HTMLDivElement>(null);
  const olderLoadThrottleRef = useRef(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { files: attachments, clearFiles } = useGlobalFileStorage();
  const { selectedMessages } = useSelector((state: RootState) => state.utils);
  const [isTextareaDisabled, setIsTextareaDisabled] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);

  useEffect(() => {
    dispatch(showChat(""));
  }, [dispatch]);

  useEffect(() => {
    return () => {
      dispatch(clearSelectedMessages());
    };
  }, [dispatch]);

  useEffect(() => {
    if (convo && convo.unread !== 0 && !convoLoading && socket) {
      // setUnreads(0);
      socket.emit("updateConversation", {
        id: convo.id,
        updates: { unreadCount: 0, userId: userdata._id },
      });
      socket.emit("markRead", { chatId: convo.id });
      dispatch(updateConversation({ id: convo.id, updates: { unread: 0 } }));
      dispatch(
        updateMessage({
          updates: {
            status: "delivered" as msgStatus,
          },
        })
      );
    }
  }, [convo, convoLoading, dispatch, convo?.unread, socket, userdata._id]);

  const Messages = useMemo(() => {
    return messages?.filter((msg) => {
      return msg.chatId === pid;
    });
  }, [messages, pid]);

  const getCachedData = useCallback(
    (id: string) => {
      const cachedData = localStorage.getItem(id);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        if (Date.now() - parsedData.timestamp < 60000 * 5) {
          // Cache for 5 minutes
          return parsedData.data;
        } else {
          localStorage.removeItem(id);
        }
      }
      return null;
    },
    [friendId]
  );

  const fetchFromAPI = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/users?query=${encodeURIComponent(id)}&search=true`);
      if (!response.ok) {
        // console.log();
      }
      const body = await response.json();
      const arr = Array.isArray(body?.data) ? body.data : [];
      const row = arr[0];
      if (row?._id != null)
        localStorage.setItem(
          String(row._id),
          JSON.stringify({
            data: row,
            timestamp: Date.now(),
          })
        );
      return row;
    },
    [friendId]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      if (friendId) {
        const cachedData = getCachedData(friendId);
        if (cachedData) {
          setOtherPerson(cachedData);
        } else {
          const apiData = await fetchFromAPI(friendId);
          setOtherPerson(apiData);
        }
      } else {
        // If friendId is not available, try to fetch using pid
        const cachedData = getCachedData("userdata");
        if (cachedData) {
          setOtherPerson(cachedData);
        } else {
          const apiData = await fetchFromAPI(userdata._id);
          setOtherPerson(apiData);
        }
      }
    } catch (error) {
      setError(true);
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [friendId, userdata]);

  useEffect(() => {
    if (!friendId && pid !== userdata._id && !convo && !convoLoading) {
      // console.log('Redirecting to /chats due to missing friendId and convo');
      router.push("/chats");
    }
  }, [convo, convoLoading, friendId, pid, router, userdata._id]);

  useEffect(() => {
    if (!friendId) return;
    (async () => {
      fetchData();
    })();
  }, [friendId]);

  const stopTypingSignal = useCallback(() => {
    if (!socket || !pid || !friendId) return;
    if (!typingTimeoutRef.current) return;
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
    lastTypingEmitRef.current = 0;
    socket.emit("stopTyping", { user: userdata, to: `user:${friendId}`, chatId: pid });
  }, [socket, pid, friendId, userdata]);

  const handleSendMessage = async (
    id: string,
    mentions?: { userId: string; username: string }[],
    override?: { content: string; messageType: MessageType }
  ) => {
    if (!override && newMessage.trim() === "" && attachments.length === 0) {
      return; // Don't send empty messages or messages without attachments
    }
    let lastMessageId = "";

    try {
      if (otherPerson.accountType === "bot") {
        setIsTextareaDisabled(true);
      }
      const isRead = friendId
        ? { [userdata._id]: false, [friendId]: true }
        : { [userdata._id]: true };

      // Prepare the message object
      const msg = new ChatMessage({
        _id: generateObjectId(),
        chatId: pid,
        sender: {
          id: userdata._id,
          name: userdata?.name || "",
          displayPicture: userdata?.displayPicture || "",
          verified: userdata?.verified || false,
          username: userdata?.username || "",
        },
        receiverId: friendId || userdata._id,
        content: override?.content ?? newMessage,
        timestamp: new Date().toISOString(),
        chatType: "DM" as ChatType,
        messageType: override?.messageType ?? ("Markdown" as MessageType),
        reactions: [],
        attachments: [] as Attachment[], // Will be populated with file data
        quotedMessageId: id,
        status: "sending" as msgStatus,
        mentions: mentions ?? [],
      });
      lastMessageId = msg._id;

      if (attachments.length && !override) {
        // Read and process all files
        const fileReadPromises = attachments.map((file) => {
          return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const fileData = reader.result as ArrayBuffer;
              msg.attachments.push({
                key: timeFormatter() + "/" + file.name,
                name: file.name,
                type: file.type,
                size: file.size,
                lastModified: new Date(file.lastModified).toISOString(),
                data: Array.from(new Uint8Array(fileData)),
              });
              resolve();
            };
            reader.onerror = () => {
              reject(new Error(`Failed to read file: ${file.name}`));
            };
            reader.readAsArrayBuffer(file as unknown as Blob);
          });
        });

        // Wait for all files to be read
        await Promise.all(fileReadPromises);
      }

      // Dispatch actions to update the state
      const msgCopy = msg.copy();
      msgCopy.mentions = mentions ?? [];
      msgCopy.attachments = msgCopy.attachments.map((m, index) => {
        const objectURL = URL.createObjectURL(attachments[index]);
        return {
          url: objectURL,
          ...m,
        };
      });

      dispatch(addMessage(msgCopy));
      dispatch(
        updateConversation({
          id: msg._id as string,
          updates: {
            unread: isRead[userdata._id] ? convo.unread : (convo.unread ?? 0) + 1,
            lastMessage: lastMessagePreview(msg.content),
            lastUpdated: msg.timestamp,
          },
        })
      );

      // Emit the message via Socket.IO
      if (socket) {
        try {
          if (otherPerson.accountType === "bot") {
            const response = await axiosApi.post("/api/chat", {
              messages: [...Messages, msg],
            });
            if (response.status !== 200) {
              throw new Error("Failed to get bot response");
            }
            const botResponse = response.data.result;
            dispatch(addMessage(botResponse));
            dispatch(
              updateConversation({
                id: msg._id as string,
                updates: {
                  lastMessage: botResponse.content,
                  lastUpdated: botResponse.timestamp,
                },
              })
            );
          } else {
            socket.emit("chatMessage", msg);
          }
          // console.log('Message emitted:', msg);
        } catch (error) {
          console.error("Socket emission error:", error);
          throw new Error("Failed to emit message");
        }
      }

      // Reset the message input and attachments
      if (!override) setNewMessage("");
      stopTypingSignal();
      clearFiles();
      closeQuote();
      const txt = document.getElementById("txt");
      if (txt) txt.style.height = "38px";

      // Scroll to the bottom of the chat
      setTimeout(() => {
        scrollToBottom();
      }, 1000);
    } catch (error) {
      console.error("Error sending message:", error);
      dispatch(deleteMessage(lastMessageId));
      toast.error("Error", {
        description: "Failed to send message. Please try again.",
      });
    } finally {
      setIsTextareaDisabled(false);
    }
  };

  useEffect(() => {
    const updateTimer = () => {
      const timeDifference = Date.now() - Date.parse(convo?.timestamp);
      if (timeDifference > 86400 * 1000) {
        const today = new Date();
        const lastUpdatedDate = new Date(convo?.timestamp);
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
        setTime(updateLiveTime("chat-time", convo?.timestamp));
      }
    };

    updateTimer();
  }, [convo?.timestamp]);

  const closeQuote = () => {
    setQuote(initialQuoteState);
  };

  const handleClick = () => {
    dispatch(clearSelectedMessages());
    dispatch(showChat("hidden"));
    router.push("/chats");
  };

  const handleTyping = (hasText: boolean = true) => {
    if (!socket || !pid || !friendId || !userSettings.showTypingStatus) return;
    const payload = { user: userdata, to: `user:${friendId}`, chatId: pid };

    if (!hasText) {
      stopTypingSignal();
      return;
    }

    // Throttle the "typing" signal; the stop timer below is still refreshed on every keystroke.
    const now = Date.now();
    if (now - lastTypingEmitRef.current >= 1200) {
      lastTypingEmitRef.current = now;
      socket.emit("typing", payload);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
      lastTypingEmitRef.current = 0;
      socket.emit("stopTyping", payload);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (!typingTimeoutRef.current) return;
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
      if (socket && pid && friendId) {
        socket.emit("stopTyping", { user: userdata, to: `user:${friendId}`, chatId: pid });
      }
    };
  }, [socket, pid, friendId, userdata]);

  useEffect(() => {
    if (searchParams && searchParams.get("search") === "true") {
      openSearchBar(true);
      setSearchFocus(true);
      setSearchQuery(searchParams.get("searchQuery") || "");
    } else {
      openSearchBar(false);
      setSearchFocus(false);
      setSearchQuery("");
    }
    // Only the URL drives this; depending on searchQuery would reset what the user is typing.
  }, [searchParams]);

  const options = [
    { id: 1, name: "View contact", action: () => router.push(`/chats/${pid}/settings`) },
    {
      id: 2,
      name: "Search",
      action: () => {
        const currParams = new URLSearchParams(searchParams?.toString() || "");
        currParams.set("search", "true");
        router.push(`/chats/${pid}?${currParams.toString()}`, { scroll: false });
      },
    },
    { id: 3, name: "Mute notifications", action: () => console.log("Mute notifications") },
    { id: 4, name: "Wallpaper", action: () => console.log("Wallpaper") },
    // Deleting removes the chat on the server for everyone in it, so confirm first.
    { id: 5, name: "Delete", action: () => setDeleteOpen(true) },
    { id: 6, name: "Report", action: () => console.log("Blocked") },
    {
      id: 7,
      name: convo?.pinned ? "Unpin" : "Pin",
      action: () => {
        dispatch(updateConversation({ id: pid, updates: { pinned: !convo?.pinned } }));
      },
    },
    {
      id: 9,
      name: convo?.archived ? "Unarchive" : "Archive",
      action: () => {
        dispatch(updateConversation({ id: pid, updates: { archived: !convo?.archived } }));
      },
    },
  ];

  const lastMessageIdRef = useRef<string | null>(null);
  const atBottomRef = useRef(true);

  useLayoutEffect(() => {
    const box = messageBoxRef.current;
    const last = Messages?.[Messages.length - 1];
    if (!box || !last) return;
    const lastId = String(last._id);
    const isFirst = lastMessageIdRef.current === null;
    const isNew = lastMessageIdRef.current !== lastId;
    lastMessageIdRef.current = lastId;
    if (!isNew) return; // older messages were prepended; keep position
    const mine = last.sender?.id === userdata?._id;
    if (isFirst) box.scrollTop = box.scrollHeight;
    else if (atBottomRef.current || mine) scrollToBottom();
  }, [Messages]);


  const scrollToBottom = () => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTo({
        top: messageBoxRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const handleScroll = () => {
    const box = messageBoxRef.current;
    if (!box) return;
    const { scrollTop, scrollHeight, clientHeight } = box;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    atBottomRef.current = isNearBottom;
    setShowScrollButton(!isNearBottom);

    if (
      scrollTop < 120 &&
      messagesHasMore &&
      !loadingMoreMessages &&
      scrollHeight > clientHeight + 40
    ) {
      const now = Date.now();
      if (now - olderLoadThrottleRef.current < 900) return;
      olderLoadThrottleRef.current = now;
      const prevSH = box.scrollHeight;
      const prevST = box.scrollTop;
      void (async () => {
        await dispatch(fetchMoreChatMessages() as never);
        requestAnimationFrame(() => {
          const b = messageBoxRef.current;
          if (!b) return;
          b.scrollTop = prevST + (b.scrollHeight - prevSH);
        });
      })();
    }
  };

  // Skips deleted-message placeholders, which would otherwise match words like "deleted".
  const searchResults = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return [];
    return Messages.filter(
      (message) =>
        !message.content.endsWith(DELETED_MARKER) && message.content.toLowerCase().includes(needle)
    );
  }, [searchQuery, Messages]);

  return (
    <div
      className={`bg-white tablets1:flex ${chaT} border-l z-10 flex size-full max-h-screen min-h-screen flex-1 flex-col overflow-hidden rounded-lg shadow-md tablets1:z-[unset] tablets1:w-auto mobile:absolute dark:bg-black`}
    >
      <div className="sticky top-0 z-10 flex min-h-12 items-center justify-between gap-4 bg-gray-100 px-3 py-2 dark:bg-zinc-900 dark:text-slate-200">
        {!searchBarOpen ? (
          <>
            <div className="flex items-center justify-start gap-4">
              <FontAwesomeIcon
                onClick={handleClick}
                icon={"arrow-left"}
                className="icon-arrow-left max-h-[21px] cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                size="lg"
              />
              {load && !otherPerson._id ? (
                <Skeleton className="mb-1 h-4 w-24 rounded bg-gray-200" />
              ) : (
                <div>
                  <div className="flex items-center text-left text-sm font-semibold">
                    <div className="truncate">{otherPerson?.name}</div>
                    {otherPerson?.verified && <Statuser className="ml-1 size-4" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {onlineUsers.includes(otherPerson?._id as string)
                      ? "Online"
                      : convo?.lastSeenHidden
                        ? "Offline"
                        : `Last seen: ${time}`}
                    {convo?.isTypingList.some((i) => i.chatId === pid) && " • typing…"}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {socket && otherPerson?.accountType !== "bot" && (
                <CallButton
                  roomId={pid}
                  targetUserId={friendId}
                  chatType={"DM"}
                  onInitiateCall={callHooks.initiateCall}
                  disabled={callHooks.callState.isInCall}
                />
              )}
              <Popover>
                <PopoverTrigger>
                  <EllipsisVertical className="max-h-[21px] cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200" />
                </PopoverTrigger>
                <PopoverContent className="z-10 mr-2 mt-2 max-w-52 rounded-md bg-white p-0 shadow-lg dark:bg-zinc-800">
                  <ul className="py-1">
                    {options.map((option) => (
                      <li
                        key={option.id}
                        className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (socket) {
                            option.action();
                            switch (true) {
                              case option.name.toLowerCase().includes("pin"):
                                socket.emit("updateConversation", {
                                  id: pid,
                                  updates: { pinned: !isPinned, userId: userdata._id },
                                });
                                break;
                              case option.name.toLowerCase().includes("archive"):
                                socket.emit("updateConversation", {
                                  id: pid,
                                  updates: { archived: !isArchived, userId: userdata._id },
                                });
                                break;
                              default:
                                break;
                            }
                          }
                        }}
                      >
                        {option.name}
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            </div>
          </>
        ) : (
          <div className="flex w-full items-center gap-2">
            <FontAwesomeIcon
              onClick={() => router.back()}
              icon={"arrow-left"}
              className="icon-arrow-left max-h-[21px] cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              size="lg"
            />
            <Input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchFocus(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="rounded-full bg-gray-100 dark:bg-zinc-800"
            />
            <button
              onClick={() => setSearchQuery("")}
              className={`${searchQuery === "" && "hidden "} py-2 font-bold text-brand hover:text-brand/70`}
            >
              Clear
            </button>
            <div
              className={`absolute right-0 top-[80%] z-50 max-h-[calc(100vh-100px)] w-full overflow-y-auto p-2 ${searchFocus ? "block" : "hidden"}`}
            >
              <div className="overflow-y-auto rounded-lg border-2 bg-white p-2 dark:bg-zinc-900 dark:shadow-slate-200">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <MessageTab
                      key={result._id}
                      message={result}
                      setQuote={setQuote}
                      onClick={() => {
                        setSearchQuery("");
                        setSearchFocus(false);
                        openSearchBar(false);
                        router.replace(`/chats/${result.chatId}#${result._id}`, { scroll: true });
                      }}
                    />
                  ))
                ) : (
                  <div className="flex h-full flex-1 flex-col items-center justify-center py-2 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-slate-200">
                      No messages found
                    </h3>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Call Status */}
      {callHooks && callHooks.callState.isInCall && (
        <CallStatus
          state={
            callHooks.callState.isConnecting
              ? "connecting"
              : callHooks.callState.isConnected
                ? "connected"
                : "idle"
          }
          callType={callHooks.callState.callType || "audio"}
          roomId={callHooks.callState.roomId || ""}
        />
      )}

      <div
        ref={messageBoxRef}
        className="flex flex-1 scroll-pt-20 flex-col overflow-y-auto px-2 pb-12 pt-4 backdrop-blur-sm"
        onScroll={handleScroll}
      >
        <div className="relative flex cursor-pointer flex-col items-center gap-2">
          {load ? (
            <div className="size-20 animate-pulse rounded-full bg-gray-200" />
          ) : (
            <>
              <div className="relative">
                <Avatar className="size-20">
                  <AvatarFallback className="capitalize">
                    {otherPerson?.name?.slice(0, 2)}
                  </AvatarFallback>
                  <AvatarImage
                    src={otherPerson?.displayPicture}
                    className="displayPicture size-20 rounded-full object-cover dark:border-slate-200"
                    width={80}
                    height={80}
                    alt="Display Picture"
                  />
                </Avatar>
                {convo?.online && (
                  <div className="absolute bottom-1 right-1 size-4 rounded-full border-2 border-white bg-green-500 dark:border-zinc-900"></div>
                )}
              </div>
            </>
          )}

          <div className="text-center">
            <p className="flex items-center justify-center text-sm font-bold dark:text-slate-200">
              {load ? (
                <span className="mb-1 h-4 w-24 animate-pulse rounded bg-gray-200" />
              ) : (
                <>
                  {otherPerson?.name ? (
                    otherPerson.name
                  ) : (
                    <span className="mb-1 h-4 w-24 animate-pulse rounded bg-gray-200" />
                  )}
                  {otherPerson?.verified && <Statuser className="size-4" />}
                </>
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {load || !otherPerson?.username ? (
                <span className="mb-1 h-4 w-24 animate-pulse rounded bg-gray-200" />
              ) : (
                "@" + otherPerson.username
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {load || !otherPerson?.bio ? (
                <span className="mb-1 h-4 w-36 animate-pulse rounded bg-gray-200" />
              ) : (
                otherPerson.bio
              )}
            </p>
          </div>
        </div>
        <div className="my-4 flex-1">
          {loadingMoreMessages && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-6 animate-spin text-gray-400" aria-label="Loading older" />
            </div>
          )}
          {Messages?.reduce((groups: { key: string; ts: string; items: typeof Messages }[], message) => {
            const key = getDayKey(message.timestamp);
            const last = groups[groups.length - 1];
            if (last && last.key === key) last.items.push(message);
            else groups.push({ key, ts: message.timestamp, items: [message] });
            return groups;
          }, []).map((group) => (
            <DateGroup key={group.key} timestamp={group.ts}>
              {group.items.map((message, i) => (
                <MessageTab
                  key={message._id as string}
                  message={message}
                  setQuote={setQuote}
                  isFirstInGroup={
                    i === 0 ||
                    group.items[i - 1].sender?.id !== message.sender?.id ||
                    group.items[i - 1].messageType === "Announcement" ||
                    message.messageType === "Announcement"
                  }
                />
              ))}
            </DateGroup>
          ))}
        </div>
        <TypingBubble users={convo?.isTypingList?.filter((i) => i.chatId === pid) ?? []} />
      </div>

      {showScrollButton && (
        <div className="absolute bottom-20 right-0 mr-4 flex items-center gap-2 rounded-full bg-gray-100 p-2 shadow-lg dark:bg-zinc-900 dark:text-slate-200">
          <ChevronDown
            className="cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={scrollToBottom}
          />
        </div>
      )}

      {selectedMessages.length ? (
        <MultiSelect />
      ) : (
        <ChatTextarea
          quote={quote}
          newMessage={newMessage}
          chatId={pid}
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          handleTyping={handleTyping}
          closeQuote={closeQuote}
          disabled={isTextareaDisabled}
        />
      )}
      {children}

      {/* Incoming Call Handler */}
      {callHooks && socket && (
        <IncomingCall
          socket={socket}
          onAccept={async (callData) => {
            // Handle incoming call acceptance
            console.log("Incoming call accepted:", callData);
            try {
              await callHooks.answerCall(callData.callId, true, {
                roomId: callData.roomId,
                callType: callData.callType,
                chatType: callData.chatType,
              });
            } catch (error) {
              console.error("Failed to answer call:", error);
            }
          }}
          onDecline={() => {
            // Handle incoming call decline
            console.log("Incoming call declined");
          }}
        />
      )}
      <DeleteChatDialog
        chatId={pid}
        name={convo?.name ?? "this person"}
        kind={convo?.type === "Personal" ? "personal" : "direct"}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          dispatch(deleteConversation(pid));
          router.replace("/chats");
        }}
      />
    </div>
  );
};

export default ChatPage;
