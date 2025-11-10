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
import { ChatMessage } from "@/lib/class/ChatMessage";
import { Attachment, MessageAttributes, MessageType, msgStatus } from "@/lib/types/type";
import { timeFormatter } from "@/lib/utils";
import {
  ConvoType,
  updateConversation,
  addMessage,
  updateMessage,
  deleteConversation,
} from "@/redux/chatSlice";
import { useAppDispatch } from "@/redux/hooks";
import { showChat } from "@/redux/navigationSlice";
import { RootState } from "@/redux/store";
import { clearSelectedMessages } from "@/redux/utilsSlice";

import ChatTextarea from "../../ChatTextarea";
import MessageTab from "../../MessageTab";
import { MultiSelect } from "../../MultiSelect";

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

const generateObjectId = () => {
  const timestamp = Math.floor(new Date().getTime() / 1000).toString(16);
  const machineId = Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0");
  const processId = Math.floor(Math.random() * 65535)
    .toString(16)
    .padStart(4, "0");
  const counter = Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0");

  return timestamp + machineId + processId + counter;
};

const ChatPage = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const router = useRouter();
  const params = useParams<{ gid: string }>();
  const dispatch = useAppDispatch();
  const { userdata } = useUser();
  const { settings: userSettings } = useSelector((state: RootState) => state.user);
  const {
    messages,
    conversations,
    loading: convoLoading,
  } = useSelector((state: RootState) => state.chat);
  const [quote, setQuote] = useState<QuoteProp>(initialQuoteState);
  const [load, setLoading] = useState<boolean>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  const [err, setError] = useState<boolean>();
  const [newMessage, setNewMessage] = useState("");
  const gid = params?.gid as string;
  const convo = conversations?.find((c) => c.id === gid) as ConvoType;
  const [group, setGroup] = useState<typeof convo>([] as unknown as typeof convo);
  const socket = useSocket();
  const callHooks = useCallManager(socket!) || null;
  const [isPinned] = useState(convo?.pinned);
  const [isArchived] = useState(convo?.archived);
  const [searchBarOpen, openSearchBar] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const otherIds = convo?.participants?.filter((id) => id !== userdata._id);
  const { chaT } = useSelector((state: RootState) => state.navigation);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDateRef = useRef<string>("");
  const messageBoxRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { files: attachments, clearFiles } = useGlobalFileStorage();
  const { selectedMessages } = useSelector((state: RootState) => state.utils);

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
    const sender = "sender" in msg ? msg?.sender?.name : "";
    return (
      msg.chatId === gid &&
      (msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sender.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }) as MessageAttributes[];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      setGroup(convo);
    } catch (error) {
      setError(true);
      console.error("Error setting data:", error);
    } finally {
      setLoading(false);
    }
  }, [convo]);

  useEffect(() => {
    if (!otherIds && !convo && !convoLoading) {
      // console.log('Redirecting to /chats due to missing otherIds and convo');
      router.push("/chats");
    }
  }, [convo, convoLoading, otherIds, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData, gid]);

  useEffect(() => {
    if (socket && gid && userdata._id) {
      socket.on("groupAnnouncement", (data: string) => {
        // console.log('You have joined a group chat');
        alert('You have joined a group chat: ' + data);
      });
    }
  }, [otherIds, gid, socket, userdata._id]);

  const handleSendMessage = async (id: string) => {
    if (newMessage.trim() === "" && attachments.length === 0) {
      return; // Don't send empty messages or messages without attachments
    }
    try {
      // console.log('send')
      const isRead = otherIds
        ? Object.fromEntries([
            [String(userdata._id), false],
            ...otherIds.map((id: string) => [id, true]),
          ])
        : { [String(userdata._id)]: true };

      const msg = new ChatMessage({
        _id: generateObjectId(),
        chatId: gid,
        sender: {
          id: String(userdata._id),
          name: userdata.name,
          displayPicture: userdata.displayPicture,
          verified: userdata.verified,
          username: userdata.username,
        },
        receiverId: gid,
        content: newMessage,
        timestamp: new Date().toISOString(),
        chatType: "Group",
        messageType: "Text" as MessageType,
        reactions: [],
        attachments: [] as Attachment[],
        quotedMessageId: id,
        status: "sending" as msgStatus
      });

      // Read and process all files
      if (attachments.length) {
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
            reader.readAsArrayBuffer(file as Blob);
          });
        });

        // Wait for all files to be read
        await Promise.all(fileReadPromises);
      }

      const msgCopy = { ...msg };
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
          id: msg._id,
          updates: {
            unread: isRead[String(userdata._id)] ? convo.unread : (convo.unread ?? 0) + 1,
            lastMessage: msg.content,
            lastUpdated: msg.timestamp,
          },
        })
      );

      if (socket) {
        try {
          socket.emit("chatMessage", msg, () => {
            // console.log('Message emitted:', msg);
          });
        } catch (error) {
          console.error("Socket emission error:", error);
          throw new Error("Failed to emit message");
        }
      }

      setNewMessage("");
      clearFiles();
      closeQuote();
      const txt = document.getElementById("txt");
      if (txt) txt.style.height = "38px";

      setTimeout(() => {
        scrollToBottom();
      }, 1000);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const closeQuote = () => {
    setQuote(initialQuoteState);
  };

  const handleClick = () => {
    dispatch(clearSelectedMessages());
    dispatch(showChat("hidden"));
    router.push("/chats");
  };

  const handleTyping = () => {
    if (!socket || !gid || !userSettings.showTypingStatus) return;
    socket.emit("typing", { user: userdata, to: `group:${gid}`, chatId: gid });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (userSettings.showTypingStatus) {
        socket.emit("stopTyping", { user: userdata, to: `group:${gid}`, chatId: gid });
      }
    }, 3000);
  };

  const options = [
    { id: 1, name: "View info", action: () => router.push(`/chats/group/${gid}/settings`) },
    { id: 2, name: "Search", action: () => openSearchBar(true) },
    { id: 3, name: "Mute notifications", action: () => console.log("Archived") },
    { id: 4, name: "Wallpaper", action: () => console.log("Hidden") },
    {
      id: 5,
      name: "Delete",
      action: () => {
        dispatch(deleteConversation(gid));
        router.replace("/chats");
      },
    },
    { id: 6, name: "Report", action: () => console.log("Blocked") },
    {
      id: 7,
      name: !convo?.pinned ? "Pin" : "Unpin",
      action: () => {
        dispatch(updateConversation({ id: gid, updates: { pinned: !convo?.pinned } }));
      },
    },
    {
      id: 9,
      name: convo?.archived ? "Unarchive" : "Archive",
      action: () =>
        dispatch(updateConversation({ id: gid, updates: { archived: !convo?.archived } })),
    },
    { id: 10, name: "Leave group", action: () => console.log("left group") },
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

  const handleScroll = () => {
    if (messageBoxRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messageBoxRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
      setShowScrollButton(isNearBottom);
    }
  };

  const scrollToBottom = () => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTo({
        top: messageBoxRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const filteredIsTypingList = convo?.isTypingList.filter((i) => i.chatId === gid);

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
                <>
                  <div className="flex items-center text-left text-sm font-semibold">
                    <div className="truncate">{group?.name}</div>
                    {group?.verified && <Statuser className="ml-1 size-4" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {filteredIsTypingList?.length > 0 &&
                      `${filteredIsTypingList.map((i) => i.name)[0]} is typing...`}
                    <b className="collapse">Group</b>
                  </p>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {callHooks && (
                <CallButton
                  roomId={gid}
                  chatType={"Group"}
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
                                  id: gid,
                                  updates: { pinned: !isPinned, userId: userdata._id },
                                });
                                break;
                              case option.name.toLowerCase().includes("archive"):
                                socket.emit("updateConversation", {
                                  id: gid,
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
        onScroll={handleScroll}
        className="flex flex-1 scroll-pt-20 flex-col overflow-y-auto px-2 pb-12 pt-4 backdrop-blur-sm"
      >
        <div className="relative flex cursor-pointer flex-col items-center gap-2">
          {load ? (
            <div className="size-20 animate-pulse rounded-full bg-gray-200" />
          ) : (
            <>
              <div className="relative">
                <Avatar className="size-20" data-src={group?.displayPicture}>
                  <AvatarFallback className="capitalize">
                    {group?.name?.slice(0, 2) || ""}
                  </AvatarFallback>
                  <AvatarImage
                    src={group?.displayPicture}
                    className="displayPicture size-20 rounded-full object-cover dark:border-slate-200"
                    width={80}
                    height={80}
                    alt="Display Picture"
                  />
                </Avatar>
                {convo?.verified && (
                  <div className="absolute bottom-1 right-1">
                    <Statuser className="size-4" />
                  </div>
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
                  {group?.name ? (
                    group.name || ""
                  ) : (
                    <span className="mb-1 h-4 w-24 animate-pulse rounded bg-gray-200" />
                  )}
                  {/* {group?.verified && 
                    <Statuser className='size-4' />
                  } */}
                </>
              )}
            </p>
            {/* <p className="text-xs text-gray-500 dark:text-gray-400">{load || !group?.username ? <span className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1" /> : '@'+group.username }</p> */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {load || !group?.description ? (
                <span className="mb-1 h-4 w-36 animate-pulse rounded bg-gray-200" />
              ) : (
                group.description
              )}
            </p>
          </div>
        </div>
        <div className="mt-4 flex-1">
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

                <MessageTab
                  key={message._id as string}
                  chat="Group"
                  message={message}
                  setQuote={setQuote}
                />
              </Fragment>
            );
            lastDateRef.current = messageDate;

            return acc;
          }, [])}
        </div>
        {filteredIsTypingList?.length > 0 && (
          <div
            key={`typing-${filteredIsTypingList[0].id}`}
            className="sticky top-0 z-[1] mb-4 mt-2 text-center"
          >
            <div className="flex flex-wrap items-center justify-center gap-2 -space-x-2">
              {filteredIsTypingList.slice(0, 3).map((i) => (
                <Avatar className="size-4" key={i.id + i.name} data-src={i.displayPicture}>
                  <AvatarFallback className="capitalize">{i.name?.slice(0, 2)}</AvatarFallback>
                  <AvatarImage
                    src={i.displayPicture}
                    className="displayPicture size-4 rounded-full object-cover dark:border-slate-200"
                    width={16}
                    height={16}
                    alt="Display Picture"
                  />
                </Avatar>
              ))}
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 shadow-sm dark:bg-zinc-800 dark:text-gray-400">
              {filteredIsTypingList
                .slice(0, 3)
                .map((i) => i.name)
                .join(", ")}{" "}
              {filteredIsTypingList.slice(0, 3).map((i) => i.name).length > 1 ? "are" : "is"}{" "}
              typing...
            </span>
          </div>
        )}
      </div>
      <div
        className={`absolute bottom-16 right-0 mr-4 flex items-center gap-2 rounded-full bg-gray-100 p-2 shadow-lg dark:bg-zinc-900 dark:text-slate-200 ${showScrollButton ? "opacity-0" : "opacity-100"}`}
      >
        <ChevronDown
          className="cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={scrollToBottom}
        />
      </div>

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
              await callHooks.answerCall(callData.callId, true);
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
