"use client";
import { getMarkdownPreference } from "@/hooks/useMarkdownPreference";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ChevronDown, EllipsisVertical, Loader2, MessageSquare } from "lucide-react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import React, { Fragment, JSX, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { CallButton, useOptionalCall } from "@/components/call";
import DeleteChatDialog from "@/components/DeleteChatDialog";
import LeaveGroupDialog from "@/components/LeaveGroupDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Statuser } from "@/components/VerificationComponent";
import { useGlobalFileStorage } from "@/hooks/useFileStorage";
import { ChatMessage } from "@/lib/class/ChatMessage";
import { unreadAfterMessage } from "@/lib/chatUnread";
import { blockFilesWhenOffline } from "@/lib/offlineFiles";
import { queueMessage } from "@/lib/outbox";
import { Attachment, MessageAttributes, MessageType, msgStatus } from "@/lib/types/type";
import { timeFormatter } from "@/lib/utils";
import {
  ConvoType,
  updateConversation,
  addMessage,
  updateMessage,
  deleteConversation,
  fetchMoreChatMessages,
} from "@/redux/chatSlice";
import { useAppDispatch } from "@/redux/hooks";
import { showChat } from "@/redux/navigationSlice";
import { RootState } from "@/redux/store";
import { DELETED_MARKER } from "@/lib/messageDeletion";
import { clearSelectedMessages } from "@/redux/utilsSlice";

import { resolveSender } from "@/lib/senderProfile";
import { convoPreviewUpdate } from "@/lib/chatPreview";
import { chatDraftKey, useDraft } from "@/hooks/useDraft";
import { TypingBubble, typingLabel } from "../../TypingIndicator";
import ChatTextarea from "../../ChatTextarea";
import { canSendMessage } from "@/lib/chatPermissions";
import { DateGroup, getDayKey } from "@/app/chats/DateDivider";
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

// Only the newest messages are mounted when a chat opens; older ones are revealed on scroll.
const INITIAL_VISIBLE = 40;
const REVEAL_STEP = 40;

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
  const searchParams = useSearchParams();
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
  const gid = params?.gid as string;
  const callCtx = useOptionalCall();
  const liveCall = callCtx?.groupCalls[gid];
  const [newMessage, setNewMessage] = useDraft(chatDraftKey(gid ?? ""));
  const convo = conversations?.find((c) => c.id === gid) as ConvoType;
  const messagesHasMore = useSelector((state: RootState) => state.chat.messagesHasMore);
  const loadingMoreMessages = useSelector((state: RootState) => state.chat.loadingMoreMessages);
  const olderLoadThrottleRef = useRef(0);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [group, setGroup] = useState<typeof convo>([] as unknown as typeof convo);
  const socket = useSocket();

  // Ask whether a call is already running in this group, to offer a "Join" banner.
  useEffect(() => {
    if (!socket || !gid) return;
    const ask = () => socket.emit("call:active", { roomId: gid });
    if (socket.connected) ask();
    socket.on("connect", ask);
    return () => {
      socket.off("connect", ask);
    };
  }, [socket, gid]);
  const [isPinned] = useState(convo?.pinned);
  const [isArchived] = useState(convo?.archived);
  const [searchBarOpen, openSearchBar] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const otherIds = convo?.participants?.filter((id) => id !== userdata._id);
  const { chaT } = useSelector((state: RootState) => state.navigation);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingEmitRef = useRef(0);
  const messageBoxRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { files: attachments, clearFiles } = useGlobalFileStorage();
  const { selectedMessages } = useSelector((state: RootState) => state.utils);
  const [searchFocus, setSearchFocus] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  // The conversation itself is never filtered by the search box.
  const Messages = useMemo(
    () => (messages?.filter((msg) => msg.chatId === gid) ?? []) as MessageAttributes[],
    [messages, gid]
  );

  const visibleMessages = useMemo(
    () => (Messages.length > visibleCount ? Messages.slice(-visibleCount) : Messages),
    [Messages, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [gid]);

  // Search matches message text or sender name, and skips deleted-message placeholders.
  const searchResults = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return [];
    return Messages.filter((msg) => {
      if (msg.content.endsWith(DELETED_MARKER)) return false;
      const sender = resolveSender(msg.sender, convo?.profiles)?.name ?? "";
      return msg.content.toLowerCase().includes(needle) || sender.toLowerCase().includes(needle);
    });
  }, [searchQuery, Messages, convo?.profiles]);

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

  const stopTypingSignal = useCallback(() => {
    if (!socket || !gid) return;
    if (!typingTimeoutRef.current) return;
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
    lastTypingEmitRef.current = 0;
    socket.emit("stopTyping", { user: userdata, to: `group:${gid}`, chatId: gid });
  }, [socket, gid, userdata]);

  const handleSendMessage = async (
    id: string,
    mentions?: { userId: string; username: string }[],
    override?: { content: string; messageType: MessageType }
  ) => {
    if (!override && newMessage.trim() === "" && attachments.length === 0) {
      return; // Don't send empty messages or messages without attachments
    }
    // Files need a connection; plain text waits in the outbox instead.
    if (!override && blockFilesWhenOffline(attachments.length)) return;
    try {
      // console.log('send')
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
        content: override?.content ?? newMessage,
        timestamp: new Date().toISOString(),
        chatType: "Group",
        messageType: override?.messageType ??
          ((getMarkdownPreference() ? "Markdown" : "Text") as MessageType),
        reactions: [],
        attachments: [] as Attachment[],
        quotedMessageId: id,
        status: "sending" as msgStatus,
        mentions: mentions ?? [],
      });

      // Read and process all files
      if (attachments.length && !override) {
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
        msg.retype(); // the type depends on what was attached
      }

      const msgCopy = { ...msg };
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
          id: msg.chatId,
          updates: {
            unread: unreadAfterMessage(convo.unread, msg, String(userdata._id)),
            ...convoPreviewUpdate(msg),
            lastUpdated: msg.timestamp,
          },
        })
      );

      // Save it before sending, so a dropped connection or a reload can't lose it. It leaves the
      // outbox when the server's copy comes back (see handleChatMessage in the root component).
      await queueMessage(String(userdata._id), msg);

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

      if (!override) setNewMessage("");
      stopTypingSignal();
      clearFiles();
      closeQuote();
      const txt = document.getElementById("txt");
      if (txt) txt.style.height = "20px";

      setTimeout(() => {
        scrollToBottom();
      }, 1000);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error", {
        description: "Failed to send message. Please try again.",
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

  const handleTyping = (hasText: boolean = true) => {
    if (!socket || !gid || !userSettings.showTypingStatus) return;
    const payload = { user: userdata, to: `group:${gid}`, chatId: gid };

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
      if (socket && gid) {
        socket.emit("stopTyping", { user: userdata, to: `group:${gid}`, chatId: gid });
      }
    };
  }, [socket, gid, userdata]);

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

  const OnOpenSettings = () => router.push(`/chats/group/${gid}/settings`)

  const options = [
    { id: 1, name: "View info", action: () => OnOpenSettings() },
    {
      id: 2,
      name: "Search",
      action: () => {
        const currParams = new URLSearchParams(searchParams?.toString() || "");
        currParams.set("search", "true");
        router.push(`/chats/group/${gid}?${currParams.toString()}`, { scroll: false });
      },
    },
    { id: 3, name: "Mute notifications", action: () => console.log("Archived") },
    { id: 4, name: "Wallpaper", action: () => console.log("Hidden") },
    // Deleting a group removes it for everyone, so only admins are offered it (with a confirmation).
    ...(convo?.adminIds?.includes(String(userdata._id))
      ? [{ id: 5, name: "Delete group", action: () => setDeleteOpen(true) }]
      : []),
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
    { id: 10, name: "Leave group", action: () => setLeaveOpen(true) },
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


  const handleScroll = () => {
    if (messageBoxRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messageBoxRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
      atBottomRef.current = isNearBottom;
      setShowScrollButton(!isNearBottom);

      if (scrollTop < 120 && visibleCount < Messages.length) {
        const box = messageBoxRef.current;
        const prevSH = scrollHeight;
        const prevST = scrollTop;
        setVisibleCount((c) => c + REVEAL_STEP);
        requestAnimationFrame(() => {
          box.scrollTop = prevST + (box.scrollHeight - prevSH);
        });
        return;
      }

      if (
        scrollTop < 120 &&
        messagesHasMore &&
        !loadingMoreMessages &&
        scrollHeight > clientHeight + 40
      ) {
        const now = Date.now();
        if (now - olderLoadThrottleRef.current < 900) return;
        olderLoadThrottleRef.current = now;
        const box = messageBoxRef.current;
        const prevSH = scrollHeight;
        const prevST = scrollTop;
        void (async () => {
          await dispatch(fetchMoreChatMessages() as never);
          requestAnimationFrame(() => {
            box.scrollTop = prevST + (box.scrollHeight - prevSH);
          });
        })();
      }
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
      className={`tablets1:flex ${chaT} bg-gray-50 dark:bg-zinc-900 border-l z-10 flex size-full max-h-screen min-h-screen flex-1 flex-col overflow-hidden rounded-lg shadow-md tablets1:z-[unset] tablets1:w-auto mobile:absolute`}
    >
      <div className="sticky top-0 z-10 border-b flex min-h-12 items-center justify-between gap-4 px-3 py-2 dark:text-slate-200">
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
                <div className="cursor-pointer" onClick={() => options[0].action()}>
                  <div className="flex items-center text-left text-sm font-semibold">
                    <div className="truncate">{group?.name}</div>
                    {group?.verified && <Statuser className="ml-1 size-4" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {filteredIsTypingList?.length > 0 && typingLabel(filteredIsTypingList)}
                    <b className="collapse">Group</b>
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {socket && (
                <CallButton
                  roomId={gid}
                  chatType="Group"
                  disabled={
                    !canSendMessage({
                      chatType: "Group",
                      onlyAdminsCanSend: convo?.onlyAdminsCanSend,
                      adminIds: convo?.adminIds,
                      userId: String(userdata._id),
                    })
                  }
                  peer={{ name: convo?.name ?? "", avatar: convo?.displayPicture }}
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
              onClick={() => router.back()}
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
                        router.replace(`/chats/group/${gid}#${result._id}`, { scroll: true });
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

      {liveCall && callCtx && callCtx.state.status === "idle" && (
        <div className="flex items-center justify-between gap-3 border-b bg-green-50 px-4 py-2 text-sm dark:border-zinc-700 dark:bg-green-950/40">
          <span className="min-w-0 truncate">
            {liveCall.callType === "video" ? "Video" : "Voice"} call in progress ·{" "}
            {liveCall.count} {liveCall.count === 1 ? "person" : "people"}
          </span>
          <button
            type="button"
            disabled={liveCall.count >= liveCall.max}
            onClick={() =>
              void callCtx.joinGroupCall({
                roomId: gid,
                name: convo?.name ?? "Group call",
                avatar: convo?.displayPicture,
              })
            }
            className="shrink-0 rounded-full bg-green-600 px-4 py-1 font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            {liveCall.count >= liveCall.max ? "Full" : "Join"}
          </button>
        </div>
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

          <div className="text-center max-w-full">
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
            <p className="break-words text-xs text-gray-500 dark:text-gray-400">
              {load || !group?.description ? (
                <span className="mb-1 h-4 w-36 animate-pulse rounded bg-gray-200" />
              ) : (
                group.description
              )}
            </p>
          </div>
        </div>
        <div className="mb-4 mt-4 flex-1">
          {loadingMoreMessages && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-6 animate-spin text-gray-400" aria-label="Loading older" />
            </div>
          )}
          {visibleMessages.reduce((groups: { key: string; ts: string; items: typeof Messages }[], message) => {
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
        <TypingBubble users={filteredIsTypingList ?? []} showAvatars />
      </div>
      <div
        className={`absolute bottom-20 right-0 mr-4 flex items-center gap-2 rounded-full bg-gray-100 p-2 shadow-lg dark:bg-zinc-900 dark:text-slate-200 ${showScrollButton ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <ChevronDown
          className="cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={scrollToBottom}
        />
      </div>

      {selectedMessages.length ? (
        <MultiSelect />
      ) : !canSendMessage({
          chatType: "Group",
          onlyAdminsCanSend: convo?.onlyAdminsCanSend,
          adminIds: convo?.adminIds,
          userId: String(userdata._id),
        }) ? (
        <div className="relative w-full">
          <div
            role="status"
            className="sticky inset-x-0 bottom-0 z-10 border-t bg-white/80 p-4 text-center text-sm text-gray-500 backdrop-blur-lg tablets1:absolute tablets1:inset-x-auto tablets1:w-full dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-gray-400"
          >
            Only admins can send messages in this group
          </div>
        </div>
      ) : (
        <ChatTextarea
          quote={quote}
          newMessage={newMessage}
          chatId={gid}
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          handleTyping={handleTyping}
          closeQuote={closeQuote}
        />
      )}
      {children}

      <LeaveGroupDialog
        chatId={gid}
        groupName={convo?.name ?? "this group"}
        userId={String(userdata._id)}
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        onLeft={() => {
          dispatch(deleteConversation(gid));
          router.replace("/chats");
        }}
      />
      <DeleteChatDialog
        chatId={gid}
        name={convo?.name ?? "this group"}
        kind="group"
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          dispatch(deleteConversation(gid));
          router.replace("/chats");
        }}
      />
    </div>
  );
};

export default ChatPage;
