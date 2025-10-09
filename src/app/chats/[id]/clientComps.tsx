/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
/* eslint-disable tailwindcss/no-custom-classname */
"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ChevronDown, EllipsisVertical } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import React, { Fragment, JSX, useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { CallButton, CallStatus, IncomingCall } from "@/components/call";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Statuser } from "@/components/VerificationComponent";
import { toast } from "@/hooks/use-toast";
import { useCallManager } from "@/hooks/useCallManager";
import { useGlobalFileStorage } from "@/hooks/useFileStorage";
import { api } from "@/lib/api";
import { ChatMessage } from "@/lib/class/ChatMessage";
import { Attachment, ChatType, MessageAttributes, MessageType, msgStatus } from "@/lib/types/type";
import { UserData } from "@/lib/types/user";
import { generateObjectId, timeFormatter } from "@/lib/utils";
import {
  ConvoType,
  updateConversation,
  addMessage,
  updateMessage,
  updateLiveTime,
  deleteConversation,
  deleteMessage,
} from "@/redux/chatSlice";
import { useAppDispatch } from "@/redux/hooks";
import { showChat } from "@/redux/navigationSlice";
import { RootState } from "@/redux/store";
import { clearSelectedMessages } from "@/redux/utilsSlice";

import ChatTextarea from "../ChatTextarea";
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
  const { onlineUsers } = useSelector((state: RootState) => state.utils);
  const { settings: userSettings } = useSelector((state: RootState) => state.user);
  const [quote, setQuote] = useState<QuoteProp>(initialQuoteState);
  const [time, setTime] = useState("");
  const [load, setLoading] = useState<boolean>();
  const [err, setError] = useState<boolean>();
  const [newMessage, setNewMessage] = useState("");
  const [otherPerson, setOtherPerson] = useState<UserData>({} as UserData);
  const pid =
    params?.id === "me"
      ? (conversations.find((c) => c.type === "Personal")?.id as string)
      : (params?.id as string);
  const socket = useSocket();
  const callHooks = useCallManager(socket!) || null;
  const convo = conversations?.find((c) => c.id === pid) as ConvoType;
  const [isPinned, setIsPinned] = useState(convo?.pinned);
  const [isArchived, setIsArchived] = useState(convo?.archived);
  const [searchBarOpen, openSearchBar] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const friendId = convo?.participants?.find((id: string) => id !== userdata._id) as string;
  const { chaT } = useSelector((state: RootState) => state.navigation);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDateRef = useRef<string>("");
  const messageBoxRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { files: attachments, clearFiles } = useGlobalFileStorage();
  const { selectedMessages } = useSelector((state: RootState) => state.utils);
  const [isTextareaDisabled, setIsTextareaDisabled] = useState(false);

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

  const Messages = messages?.filter((msg) => {
    return msg.chatId === pid && msg.content.toLowerCase().includes(searchQuery.toLowerCase());
  }) as MessageAttributes[];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);

    const getCachedData = (id: string) => {
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
    };

    const fetchFromAPI = async (id: string) => {
      const response = await fetch(`/api/users?query=${encodeURIComponent(id)}&search=true`);
      if (!response.ok) {
        // console.log();
      }
      const data = await response.json();
      localStorage.setItem(
        data[0]?._id,
        JSON.stringify({
          data: data[0],
          timestamp: Date.now(),
        })
      );
      return data[0];
    };

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
          const apiData = await fetchFromAPI(String(userdata._id));
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
    fetchData();
  }, [fetchData, friendId, pid]);

  const handleSendMessage = async (id: string) => {
    if (newMessage.trim() === "" && attachments.length === 0) {
      return; // Don't send empty messages or messages without attachments
    }
    let lastMessageId = "";

    try {
      if(otherPerson.accountType === "bot") {
        setIsTextareaDisabled(true);
      }
      const isRead = friendId
        ? { [String(userdata._id)]: false, [friendId]: true }
        : { [String(userdata._id)]: true };

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
        content: newMessage,
        timestamp: new Date().toISOString(),
        chatType: "DM" as ChatType,
        messageType: "Markdown" as MessageType,
        reactions: [],
        attachments: [] as Attachment[], // Will be populated with file data
        quotedMessageId: id,
        status: "sending" as msgStatus,
      });
      lastMessageId = msg._id;

      if (attachments.length) {
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
            unread: isRead[String(userdata._id)] ? convo.unread : (convo.unread ?? 0) + 1,
            lastMessage: msg.content,
            lastUpdated: msg.timestamp,
          },
        })
      );

      // Emit the message via Socket.IO
      if (socket) {
        try {
          if (otherPerson.accountType === "bot") {
            const response = await api.post("/api/chat", {
              messages: [...Messages, msg],
            });
            if (response.status !== 200) {
              throw new Error("Failed to get bot response");
            }
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
      setNewMessage("");
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
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
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

  const handleTyping = () => {
    if (!socket || !pid || !userSettings.showTypingStatus) return;
    socket.emit("typing", { user: userdata, to: `user:${friendId}`, chatId: pid });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (userSettings.showTypingStatus) {
        socket.emit("stopTyping", { user: userdata, to: `user:${friendId}`, chatId: pid });
      }
    }, 3000);
  };

  const options = [
    { id: 1, name: "View contact", action: () => console.log("View contact") },
    { id: 2, name: "Search", action: () => openSearchBar(true) },
    { id: 3, name: "Mute notifications", action: () => console.log("Mute notifications") },
    { id: 4, name: "Wallpaper", action: () => console.log("Wallpaper") },
    {
      id: 5,
      name: "Delete",
      action: () => {
        dispatch(deleteConversation(pid));
        router.replace("/chats");
      },
    },
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

  useEffect(() => {
    if (messageBoxRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messageBoxRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      // Only auto-scroll if user was already at the bottom
      if (!isNearBottom && !isScrolled) {
        scrollToBottom();
        setIsScrolled(true);
      }
    }
  }, [Messages, isScrolled]);

  const scrollToBottom = () => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTo({
        top: messageBoxRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const handleScroll = () => {
    if (messageBoxRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messageBoxRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
      setShowScrollButton(!isNearBottom);
    }
  };

  return (
    <div
      className={`bg-bgLight tablets1:flex ${chaT} z-10 flex size-full max-h-screen min-h-screen flex-1 flex-col overflow-hidden rounded-lg shadow-md tablets1:z-[unset] tablets1:w-auto mobile:absolute dark:bg-bgDark`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-gray-100 px-3 py-2 dark:bg-zinc-900 dark:text-slate-200">
        {!searchBarOpen ? (
          <>
            <div className="flex items-center justify-start gap-4">
              <FontAwesomeIcon
                onClick={handleClick}
                icon={"arrow-left"}
                className="icon-arrow-left max-h-[21px] cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                size="lg"
              />
              {load ? (
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
                      : `Last seen: ${time}`}
                    {convo?.isTypingList.filter((i) => i.chatId === pid).map((i) => i.name).length >
                      0 &&
                      ` • ${convo?.isTypingList.find((i) => i.chatId === pid)?.name} is typing...`}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(callHooks && otherPerson?.accountType === "bot") && (
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
              onClick={() => openSearchBar(false)}
              icon={"arrow-left"}
              className="icon-arrow-left max-h-[21px] cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              size="lg"
            />
            <Input
              type="text"
              value={searchQuery}
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
          {Messages?.reduce((acc: JSX.Element[], message, index) => {
            const messageDate = new Date(message.timestamp).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });

            acc.push(
              <Fragment key={message._id as string}>
                {index === 0 || messageDate !== lastDateRef.current ? (
                  <div
                    key={`date-${messageDate}`}
                    data-date={messageDate}
                    className="sticky top-0 z-[1] my-2 text-center"
                  >
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 shadow-sm dark:bg-zinc-800 dark:text-gray-400">
                      {messageDate}
                    </span>
                  </div>
                ) : null}

                <MessageTab key={message._id as string} message={message} setQuote={setQuote} />
              </Fragment>
            );
            lastDateRef.current = messageDate;

            return acc;
          }, [])}
        </div>
        {convo?.isTypingList?.filter((i) => i.chatId === pid).map((i) => i.name).length > 0 && (
          <div
            key={`typing-${convo?.isTypingList.find((i) => i.chatId === pid)?.id}`}
            className="sticky top-0 z-[1] my-2 mb-4 text-center"
          >
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 shadow-sm dark:bg-zinc-800 dark:text-gray-400">
              {convo?.isTypingList.find((i) => i.chatId === pid)?.name} is typing...
            </span>
          </div>
        )}
      </div>

      {showScrollButton && (
        <div className="absolute bottom-16 right-0 mr-4 flex items-center gap-2 rounded-full bg-gray-100 p-2 shadow-lg dark:bg-zinc-900 dark:text-slate-200">
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
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          handleTyping={handleTyping}
          closeQuote={closeQuote}
          disbled={isTextareaDisabled}
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
    </div>
  );
};

export default ChatPage;
