"use client";
import { Megaphone, WifiOff, X, XCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { useSelector, useStore } from "react-redux";

import { convoPreviewUpdate } from "@/lib/chatPreview";
import { deletedPreview, SENDER_DELETED_CONTENT } from "@/lib/messageDeletion";
import { toast } from "sonner";

import "@ojutalayomi/react-textarea-enhanced/dist/index.css";


import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import Bottombar from "@/components/Bottombar";
import NewChatMenu from "@/components/ComposeChat";
import ErrorBoundary from "@/components/ErrorBoundary";
import MetallicPaint from "@/components/MetallicPaint";
import PostMaker from "@/components/PostMaker";
import PostPreview from "@/components/PostPreview";
import RightSideBar from "@/components/RightSideBar";
import Sidebar from "@/components/Sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import UserPhoto from "@/components/UserPhoto";
import { useAnnouncer } from "@/hooks/useAnnouncer";
import { FileStorageProvider } from "@/hooks/useFileStorage";
import { usePushSound } from "@/hooks/usePushSound";
import {
  ChatParticipant,
  ClientComponentsProps,
  ConvoType,
  ConvoTypeProp,
  MessageAttributes,
  msgStatus,
  NewChat_,
  Reaction,
  PostSchema,
} from "@/lib/types/type";
import { UserData } from "@/lib/types/user";
import { Time } from "@/lib/utils";
import {
  updateConversation,
  setTypingUser,
  removeTypingUser,
  addMessage,
  addSetting,
  addConversation,
  markMessagesRead,
  deleteConversation,
  updateMessage,
  updateMessageReactions,
  fetchChats,
} from "@/redux/chatSlice";
import { updateFollowingFeedPosts } from "@/redux/followingFeedSlice";
import { useAppDispatch } from "@/redux/hooks";
import { addPost, updatePosts } from "@/redux/postsSlice";
import { startChatPersistence } from "@/redux/chatPersistence";
import { addRoute } from "@/redux/routeSlice";
import { RootState } from "@/redux/store";

import Error from "./error";
import logo from "./icon.svg";
import { useNetwork } from "./providers/NetworkProvider";

// Slightly longer than the sender's 3s stopTyping timer so the receiver only
// clears the indicator when a stop event never arrives (tab close, network drop).
const TYPING_INDICATOR_TTL_MS = 5000;

const INFO_ROUTES = ["/about", "/press", "/developers", "/jobs", "/privacy", "/terms", "/locations"];

const RootClientComponents = ({ children }: ClientComponentsProps) => {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const pathname = usePathname();
  const router = useRouter();
  const { deletedConversations } = useSelector((state: RootState) => state.chat);
  const { isOnline } = useNetwork();
  const [isClient, setIsClient] = useState(false);
  const showProfilePicture = pathname?.endsWith("/photo");
  const showPostPreview = pathname?.includes("/photo/");
  const [isPostMakerModalOpen, setPostMakerModalOpen] = useState(false);
  // Public info pages (About, Press, Terms, …) render full-screen without app chrome.
  const infoRoute = INFO_ROUTES.some((r) => pathname === r || pathname?.startsWith(`${r}/`));
  const hideChrome = infoRoute;
  const { userdata, loading } = useUser();
  const path = pathname?.replace("/", "") || "";
  const { conversations } = useSelector<RootState, ConvoTypeProp>((state) => state.chat);
  const [activeRoute, setActiveRouteState] = useState<string>(path);
  const [isMoreShown, setMoreStatus] = useState(false);
  const [error, setError] = useState(null);
  const [, setLoad] = useState<boolean>(false);
  const { displayAnnouncement, setDisplayAnnouncement } = useAnnouncer();
  usePushSound();
  const socket = useSocket();
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  const routes = [
    "accounts/login",
    "accounts/signup",
    "accounts/forgot-password",
    "accounts/reset-password",
  ];

  useEffect(() => {
    setIsClient(typeof window !== "undefined");
  }, []);

  useEffect(() => {
    if (pathname) {
      dispatch(addRoute(pathname)); // Add the current route to the history
    }
  }, [pathname, dispatch]);

  useEffect(() => {
    if (pathname?.includes("/compose/post")) {
      setPostMakerModalOpen(true);
    } else {
      setPostMakerModalOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    setLoad(false);
    if (pathname?.includes("/chats/")) setActiveRouteState("chats");
  }, [pathname, setActiveRouteState]);

  // Save chat changes (new messages, pins, unread counts...) to IndexedDB as they happen.
  useEffect(() => startChatPersistence(store), [store]);

  useEffect(() => {
    // Wait until the user is known. With no id the cache can't be used (it is keyed by user),
    // so firing now would download every chat and message on each reload.
    if (!userdata._id) return;
    async function fetchData() {
      await fetchChats(dispatch, userdata._id);
    }
    fetchData();
  }, [dispatch, userdata._id]);

  const gt = useCallback((chatid: string) => {
    return conversationsRef.current.find((obj) => obj.id === chatid);
  }, []);

  const handleNewChat = useCallback(
    (data: NewChat_) => {
      const uid = data.requestId;
      const participant = data.chat.participants.find((p) => p.userId === uid);
      const otherParticipant = data.chat.participants.find((p) => p.userId !== uid);
      // name: convo.chatType === 'DM' ? convo.name[Object.keys(convo.name).find(e => !e.includes(uid)) || ''] : convo.name.group,
      const obj = {
        id: data.chat._id.toString(),
        type: data.chat.chatType,
        name:
          data.chat.chatType === "DM"
            ? data.chat.name[Object.keys(data.chat.name).find((e) => !e.includes(uid)) || ""]
            : data.chat.name.group,
        adminIds: data.chat.adminIds,
        onlyAdminsCanSend: data.chat.onlyAdminsCanSend ?? false,
        displayPicture: otherParticipant?.displayPicture || "",
        description: data.chat.groupDescription || "",
        verified: data.chat.verified || false,
        lastMessage: "",
        unread: participant?.unreadCount || 0,
        favorite: participant?.favorite || false,
        pinned: participant?.pinned || false,
        deleted: participant?.deleted || false,
        archived: participant?.archived || false,
        timestamp: data.chat.timestamp,
        lastSeenHidden: data.chat.lastSeenHidden ?? false,
        lastUpdated: Time(data.chat.lastUpdated),
        participants: data.chat.participants.map((p) => p.userId),
        online: false,
        isTypingList: [],
      };
      dispatch(addConversation(obj));
      if (participant?.chatSettings) {
        dispatch(addSetting({ [data.chat._id.toString()]: participant.chatSettings }));
      }
      // console.log(data);
      return data;
    },
    [dispatch]
  );

  const handleChatMessage = useCallback(
    (msg: MessageAttributes) => {
      // console.log("msg", msg)
      dispatch(addMessage(msg));
      dispatch(
        updateMessage({
          id: String(msg._id),
          updates: {
            status: "sent" as msgStatus,
          },
        })
      );
      const conversationId = msg.chatId as string;
      const conversation = gt(conversationId);
      if (conversation) {
        dispatch(
          updateConversation({
            id: conversationId,
            updates: {
              unread: msg.isRead?.[String(userdata._id)]
                ? conversation.unread
                : (conversation.unread ?? 0) + 1,
              ...convoPreviewUpdate(msg),
              lastUpdated: msg.timestamp,
            },
          })
        );
      }
    },
    [dispatch, gt, userdata._id]
  );

  const handleTyping = useCallback(
    (data: { user: UserData; to: string; chatId: string }) => {
      if (!data?.user?._id || data.user._id === userdata._id) return;
      const key = `${data.chatId}:${data.user._id}`;

      dispatch(
        setTypingUser({
          chatId: data.chatId,
          user: {
            id: data.user._id,
            name: data.user.name,
            displayPicture: data.user.displayPicture || "",
            username: data.user.username,
            isTyping: true,
            chatId: data.chatId,
          },
        })
      );

      const existing = typingTimers.current.get(key);
      if (existing) clearTimeout(existing);
      typingTimers.current.set(
        key,
        setTimeout(() => {
          typingTimers.current.delete(key);
          dispatch(removeTypingUser({ chatId: data.chatId, userId: data.user._id }));
        }, TYPING_INDICATOR_TTL_MS)
      );
    },
    [dispatch, userdata._id]
  );

  const handleStopTyping = useCallback(
    (data: { user: UserData; to: string; chatId: string }) => {
      if (!data?.user?._id || data.user._id === userdata._id) return;
      const key = `${data.chatId}:${data.user._id}`;

      const existing = typingTimers.current.get(key);
      if (existing) clearTimeout(existing);
      typingTimers.current.delete(key);

      dispatch(removeTypingUser({ chatId: data.chatId, userId: data.user._id }));
    },
    [dispatch, userdata._id]
  );

  useEffect(() => {
    if (!socket) return;

    socket.on("newMessage", handleChatMessage);
    socket.on("userTyping", handleTyping);
    socket.on("userStopTyping", handleStopTyping);
    socket.on("lastActive", ({ userId, lastActive }) => {
      if (!lastActive) return;
      const convo = conversationsRef.current.find(
        (c) => c.participants.includes(userId) && c.type === "DM"
      );
      if (!convo) return;
      dispatch(updateConversation({ id: convo.id, updates: { timestamp: lastActive } }));
    });
    socket.on(
      "chatError",
      (data: { error: string; chatId?: string; updates?: Partial<ConvoType> }) => {
        toast.error(data.error);
        if (!data.chatId || !data.updates) return;
        if (data.updates.deleted) {
          dispatch(
            addConversation(
              deletedConversations.find((convo) => convo.id === data.chatId) as ConvoType
            )
          );
        } else {
          dispatch(updateConversation({ id: data.chatId, updates: data.updates }));
        }
      }
    );
    socket.on("newChat", (data: NewChat_) => {
      handleNewChat(data);
      socket.emit("joinChat", { chatId: data.chat._id });
    });
    socket.on(
      "chatParticipantsUpdated",
      (data: { chatId: string; participants: ChatParticipant[]; adminIds?: string[] }) => {
        dispatch(
          updateConversation({
            id: data.chatId,
            updates: {
              participants: data.participants.map((p) => p.userId),
              ...(data.adminIds ? { adminIds: data.adminIds } : {}),
            },
          })
        );
      }
    );
    socket.on("messagesRead", (data: { readerId: string; messageIds: string[] }) => {
      dispatch(markMessagesRead({ messageIds: data.messageIds, readerId: data.readerId }));
      // The list shows a read tick on the latest message, so mark it when it was read.
      if (data.readerId === userdata._id) return;
      for (const convo of store.getState().chat.conversations) {
        if (
          convo.lastMessageId &&
          convo.lastSenderId === userdata._id &&
          !convo.lastRead &&
          data.messageIds.includes(convo.lastMessageId)
        ) {
          dispatch(updateConversation({ id: convo.id, updates: { lastRead: true } }));
        }
      }
    });
    // A message was deleted for everyone (by its sender or a group admin).
    socket.on(
      "messageDeleted",
      (data: {
        chatId: string;
        messageId: string;
        content: string;
        deletedBy?: string;
        byAdmin?: boolean;
      }) => {
        const state = store.getState();
        const old = state.chat.messages.find((m) => String(m._id) === data.messageId);
        // The sender's own screen already says "You deleted this message".
        const mine = !data.byAdmin && data.deletedBy === userdata._id;
        const content = mine ? SENDER_DELETED_CONTENT : data.content;
        dispatch(updateMessage({ id: data.messageId, updates: { content, attachments: [] } }));

        // Only touch the chat-list preview when the deleted message is the one it shows.
        const convo = state.chat.conversations.find((c) => c.id === data.chatId);
        if (
          convo &&
          (convo.lastMessageId === data.messageId || (old && convo.lastMessage.endsWith(old.content)))
        ) {
          dispatch(
            updateConversation({ id: data.chatId, updates: { lastMessage: deletedPreview(content) } })
          );
        }
      }
    );
    socket.on("chatRemoved", (data: { chatId: string }) => {
      dispatch(deleteConversation(data.chatId));
      // Read the live location so this listener does not have to rebind on navigation.
      if (window.location.pathname.startsWith(`/chats/group/${data.chatId}`)) {
        router.replace("/chats");
      }
    });
    socket.on("post_response", (data: { message: string; success: boolean }) => {
      setDisplayAnnouncement({
        status: true,
        message: data.message,
      });
    });
    socket.on("delete_post_response", (data: { message: string; success: boolean }) => {
      setDisplayAnnouncement({
        status: true,
        message: data.message,
      });
    });
    socket.on(
      "post_reaction_response",
      (data: { message: string; success: boolean; postId?: string; reaction?: string }) => {
        // PostCard owns the optimistic like/bookmark state and reverts it on failure;
        // this payload carries no counts, so only surface the message here.
        setDisplayAnnouncement({
          status: true,
          message: data.message,
        });
      }
    );
    socket.on("newPost", (data: { excludeUser: string; blog: PostSchema }) => {
      dispatch(addPost(data.blog));
      if (data.excludeUser !== userdata._id) {
        setDisplayAnnouncement({
          status: true,
          message: `New ${data.blog.Type} from ${data.blog.Username}`,
        });
      }
    });

    // Handle follow notifications
    socket.on(
      "followNotification",
      (data: {
        followedDetails: UserData;
        followerDetails: UserData;
        following?: boolean;
        type?: "follow" | "unfollow";
        timestamp?: string;
      }) => {
        const nowFollowing =
          typeof data.following === "boolean"
            ? data.following
            : Boolean(data.followedDetails.isFollowing);

        if (data.followedDetails._id?.toString() === userdata._id) {
          toast(
            nowFollowing
              ? `${data.followerDetails.username} started following you`
              : `${data.followerDetails.username} unfollowed you`
          );
        } else if (data.followerDetails._id?.toString() === userdata._id) {
          const authorId = data.followedDetails._id?.toString() || "";
          const updates = { IsFollowing: nowFollowing };
          dispatch(updatePosts({ key: "UserId", value: authorId, updates }));
          dispatch(updateFollowingFeedPosts({ key: "UserId", value: authorId, updates }));
        }
      }
    );

    socket.on(
      "conversationUpdated",
      (data: {
        id: string;
        updates: { unread: number; lastMessage: string; lastUpdated: string };
      }) => {
        if (data.id === userdata._id) {
          dispatch(updateConversation({ id: data.id, updates: data.updates }));
        }
      }
    );
    socket.on("reactionAdded", (data: Reaction) => {
      if (data.userId === userdata._id) return;
      dispatch(
        updateMessageReactions({
          id: data.messageId,
          updates: {
            _id: data._id,
            messageId: data.messageId,
            userId: data.userId,
            reaction: data.reaction,
            timestamp: data.timestamp,
          },
        })
      );
    });

    socket.on("reactionRemoved", (data: Reaction) => {
      if (data.userId === userdata._id) return;
      dispatch(
        updateMessageReactions({
          id: data.messageId,
          updates: {
            _id: data._id,
            messageId: data.messageId,
            userId: data.userId,
            reaction: data.reaction,
            timestamp: data.timestamp,
          },
        })
      );
    });

    socket.on("reactionUpdated", (data: Reaction) => {
      if (data.userId === userdata._id) return;
      dispatch(
        updateMessageReactions({
          id: data.messageId,
          updates: {
            _id: data._id,
            messageId: data.messageId,
            userId: data.userId,
            reaction: data.reaction,
            timestamp: data.timestamp,
          },
        })
      );
    });

    socket.on(
      "mentionNotification",
      (data: {
        messageId: string;
        chatId: string;
        chatType: string;
        mentionedBy: { userId: string; username: string; displayPicture: string };
        content: string;
        timestamp: string;
      }) => {
        toast(`@${data.mentionedBy.username} mentioned you`, {
          description: data.content.length > 80 ? data.content.slice(0, 80) + "\u2026" : data.content,
          action: {
            label: "View",
            onClick: () => {
              if (data.chatType === "Group") {
                window.location.href = `/chats/group/${data.chatId}`;
              } else {
                window.location.href = `/chats/${data.chatId}`;
              }
            },
          },
        });
      }
    );

    return () => {
      socket.off("newMessage", handleChatMessage);
      socket.off("userTyping", handleTyping);
      socket.off("userStopTyping", handleStopTyping);
      socket.off("lastActive");
      socket.off("newChat", handleNewChat);
      socket.off("post_response");
      socket.off("delete_post_response");
      socket.off("post_reaction_reponse");
      socket.off("newPost");
      socket.off("followNotification");
      socket.off("conversationUpdated");
      socket.off("reactionAdded");
      socket.off("reactionRemoved");
      socket.off("reactionUpdated");
      socket.off("mentionNotification");
      socket.off("chatError");
      socket.off("chatParticipantsUpdated");
      socket.off("chatRemoved");
      socket.off("messageDeleted");
      socket.off("messagesRead");
    };
  }, [socket, router, store, userdata._id, handleChatMessage, handleNewChat, handleTyping, handleStopTyping]);

  useEffect(() => {
    const timers = typingTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const setActiveRoute = useCallback((route: string) => {
    setActiveRouteState(route);
  }, []);

  const handleReset = () => {
    setError(null);
  };

  return (
    <>
      {displayAnnouncement.status && (
        <div
          id="announcement"
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-4 z-[999] flex justify-center px-4"
        >
          <div className="shadow-sxs relative isolate flex w-full items-center justify-center overflow-hidden rounded-sm border border-primary/20 bg-brand px-4 py-2 tracking-tight">
            <div
              aria-hidden="true"
              className="absolute left-[max(-7rem,calc(50%-52rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl"
            >
              <div
                style={{
                  clipPath:
                    'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)',
                }}
                className="aspect-[577/310] w-[36rem] bg-gradient-to-r from-primary to-primary/60 opacity-30"
              />
            </div>

            <div
              aria-hidden="true"
              className="absolute left-[max(45rem,calc(50%+8rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl"
            >
              <div
                style={{
                  clipPath:
                    'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)',
                }}
                className="aspect-[577/310] w-[36rem] bg-gradient-to-r from-primary to-primary/60 opacity-30"
              />
            </div>

            <div className="relative z-10 flex-col items-center space-y-2 text-sm sm:flex sm:flex-row sm:gap-3 sm:space-y-0">
              <div className="text-md flex items-center gap-3 font-medium text-foreground">
                {displayAnnouncement.message}
              </div>

              {/* <div className="group flex items-center gap-3">
                <div className="hidden size-1 rounded-full bg-primary sm:block" />

                <Button className="tetx-shadow-sm rounded-sm border border-white/20 bg-white/30 text-foreground shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),inset_0_-2px_5px_rgba(0,0,0,0.1),0_8px_20px_rgba(0,0,0,0.1)] dark:border-white/20 dark:bg-white/10 dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.3),0_8px_20px_rgba(0,0,0,0.25)]">
                  See what’s new
                  <HiArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Button>
              </div> */}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDisplayAnnouncement({ status: false, message: "" })}
              className="absolute right-2 rounded-lg text-foreground hover:bg-transparent hover:text-foreground/70 dark:hover:bg-transparent"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}
      {/* {loading && (
        <div className="pointer-events-none fixed inset-x-0 z-[999] flex size-full justify-center backdrop-blur-xl">
          <MetallicPaint text="Velo" edgeBend={0.9}
            density={2.5}
            softness={1}
            dispersion={0}
            distortion={0}
            angle={100}
            scale={0.6}
            speed={1}
            rotation={0}
            mouseTilt={0.5}
            intro
            imageSrc={logo} />
        </div>
      )} */}
      <div id="root" className="overflow-hidden">
        <ErrorBoundary fallback={<Error error={error} reset={handleReset} />}>
          <FileStorageProvider>
            <PostMaker open={isPostMakerModalOpen} onOpenChange={setPostMakerModalOpen} />
            <NewChatMenu />
            {!isOnline && isClient && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
                <WifiOff className="size-12 text-muted-foreground" />
                <h3 className="mt-2 text-lg font-semibold">You&apos;re Offline</h3>
                <p className="text-sm text-muted-foreground">
                  Please check your internet connection
                </p>
              </div>
            )}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!hideChrome ? (
              <Sidebar
                setLoad={setLoad}
                activeRoute={activeRoute}
                setActiveRoute={setActiveRoute}
              />
            ) : null}
            {/* <pre data-testid="client-component">{JSON.stringify(user, null, 2)}</pre>; */}
            <div id="detail" className="bg-gray-50 dark:bg-zinc-900/95">
              {!hideChrome && <AnnouncementBanner />}
              {children}
              {showProfilePicture && <UserPhoto />}
              {showPostPreview && <PostPreview />}
            </div>
            {!hideChrome ? <RightSideBar /> : null}
            {!pathname?.includes("posts") &&
            !pathname?.startsWith("/chats/") &&
            !routes.includes(activeRoute) &&
            !hideChrome ? (
              <Bottombar
                setLoad={setLoad}
                isMoreShown={isMoreShown}
                activeRoute={activeRoute}
                setActiveRoute={setActiveRoute}
                setMoreStatus={setMoreStatus}
              />
            ) : null}
          </FileStorageProvider>
        </ErrorBoundary>
      </div>
    </>
  );
};
export default RootClientComponents;
