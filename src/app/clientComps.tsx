"use client";
import { WifiOff, XCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import Bottombar from "@/components/Bottombar";
import { ConfirmCall } from "@/components/callConfirmation";
import NewChatMenu from "@/components/ComposeChat";
import ErrorBoundary from "@/components/ErrorBoundary";
import PostMaker from "@/components/PostMaker";
import PostPreview from "@/components/PostPreview";
import Sidebar from "@/components/Sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UserPhoto from "@/components/UserPhoto";
import { toast } from "@/hooks/use-toast";
import { useAnnouncer } from "@/hooks/useAnnouncer";
import { FileStorageProvider } from "@/hooks/useFileStorage";
import {
  ClientComponentsProps,
  ConvoType,
  ConvoTypeProp,
  MessageAttributes,
  msgStatus,
  NewChat_,
  Reaction,
  ReactionType,
  PostSchema 
} from "@/lib/types/type";
import { UserData } from "@/lib/types/user";
import {
  updateConversation,
  addMessage,
  addSetting,
  fetchChats,
  addConversation,
  Time,
  updateMessage,
  updateMessageReactions,
} from "@/redux/chatSlice";
import { useAppDispatch } from "@/redux/hooks";
import { addPost, deletePost, updatePost, updatePosts } from "@/redux/postsSlice";
import { addRoute } from "@/redux/routeSlice";
import { RootState } from "@/redux/store";

import Error from "./error";
import VideoChat from "../components/CallPage";
import { useNetwork } from "./providers/NetworkProvider";



const ClientComponents = ({ children }: ClientComponentsProps) => {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const { deletedConversations } = useSelector((state: RootState) => state.chat);
  const { isOnline } = useNetwork();
  const [isClient, setIsClient] = useState(false);
  const showProfilePicture = pathname?.endsWith("/photo");
  const showPostPreview = pathname?.includes("/photo/");
  const [isPostMakerModalOpen, setPostMakerModalOpen] = useState(false);
  const callRoute = pathname?.startsWith("/call");
  const { userdata } = useUser();
  const path = pathname?.replace("/", "") || "";
  const { conversations } = useSelector<RootState, ConvoTypeProp>((state) => state.chat);
  const [activeRoute, setActiveRouteState] = useState<string>(path);
  const [isMoreShown, setMoreStatus] = useState(false);
  const [error, setError] = useState(null);
  const [, setLoad] = useState<boolean>(false);
  const { displayAnnouncement, setDisplayAnnouncement } = useAnnouncer();
  const [incomingCallId, setIncomingCallId] = useState<string | null>(null);
  const socket = useSocket();
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

  useEffect(() => {
    async function fetchData() {
      await fetchChats(dispatch);
    }
    fetchData();
  }, [dispatch]);

  const gt = useCallback(
    (chatid: string) => {
      return conversations.find((obj) => obj.id === chatid);
    },
    [conversations]
  );

  const handleChat = useCallback(
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
              lastMessage: msg.content,
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
      if (data.user._id === userdata._id) return null;
      const conversation = conversations.find((c) => c.id === data.chatId);
      if (conversation) {
        dispatch(
          updateConversation({
            id: data.chatId,
            updates: {
              isTypingList: [
                ...conversation.isTypingList,
                {
                  id: data.user._id as string,
                  name: data.user.name,
                  displayPicture: data.user.displayPicture || "",
                  username: data.user.username,
                  isTyping: true,
                  chatId: data.chatId,
                },
              ],
            },
          })
        );
      }
    },
    [dispatch, userdata._id]
  );

  const handleStopTyping = useCallback(
    (data: { user: UserData; to: string; chatId: string }) => {
      if (data.user._id === userdata._id) return null;
      const conversation = conversations.find((c) => c.id === data.chatId);
      if (conversation) {
        dispatch(
          updateConversation({
            id: data.chatId,
            updates: {
              isTypingList: conversation.isTypingList.filter((u) => u.id !== data.user._id),
            },
          })
        );
      }
    },
    [dispatch, userdata._id]
  );

  useEffect(() => {
    if (!socket) return;

    socket.on("newMessage", handleChatMessage);
    socket.on("userTyping", handleTyping);
    socket.on("userStopTyping", handleStopTyping);
    socket.on("lastActive", ({ userId, lastActive }) => {
      const convo = conversations.find((c) => c.participants.includes(userId) && c.type === "DM");
      dispatch(updateConversation({ id: convo?.id ?? "", updates: { timestamp: lastActive } }));
    });
    socket.on(
      "chatError",
      (data: { error: string; chatId: string; updates: Partial<ConvoType> }) => {
        toast({
          title: data.error,
          variant: "destructive",
        });
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
      handleChat(data);
      socket.emit("joinChat", { chatId: data.chat._id });
    });
    // New invite event to trigger call confirmation
    socket.on(
      "call:invite",
      ({
        callId,
        roomId,
        callerId,
        callType,
        chatType,
      }: {
        callId: string;
        roomId: string;
        callerId: string;
        callType: "audio" | "video";
        chatType: "DM" | "Group";
      }) => {
        console.log("[call] invite received", { callId, roomId, callerId, callType, chatType });
        setIncomingCallId(callId);
        // Optionally, you could store more call info in state if needed
        // setIncomingCallInfo({ callId, roomId, callerId, callType, chatType });
      }
    );
    // Back-compat: still handle offer as invite trigger
    socket.on("offer", async (data: { offer: RTCSessionDescription; room: string }) => {
      const { room, offer } = data as any;
      try {
        localStorage.setItem(
          `webrtc:offer:${room}`,
          typeof offer === "string" ? offer : JSON.stringify(offer)
        );
      } catch {}
      setIncomingCallId(room);
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
      (data: { message: string; success: boolean; postId: string; reaction: ReactionType }) => {
        // alert(data.message);
        if (data.success) return;
        dispatch(
          updatePost({
            id: data.postId,
            updates: {
              [`${data.reaction.key1}`]: data.reaction.key1,
              [`${data.reaction.key2}`]: data.reaction.key2,
            },
          })
        );
        setDisplayAnnouncement({
          status: true,
          message: data.message,
        });
      }
    );
    socket.on("deletePost", (data: { excludeUser: string; postId: string; type: string }) => {
      dispatch(deletePost(data.postId));
    });
    socket.on(
      "updatePost",
      (data: {
        excludeUserId: string;
        postId: string;
        update: Partial<PostSchema>;
        type: string;
      }) => {
        dispatch(updatePost({ id: data.postId, updates: data.update }));
        // if(data.excludeUserId !== userdata._id) {
        //     setDisplayAnnouncement({
        //         status: true,
        //         message: `New ${data.type}`
        //     })
        // }
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
        type: "follow" | "unfollow";
        timestamp: string;
      }) => {
        if (data.followedDetails._id?.toString() === userdata._id) {
          toast({
            title: data.followedDetails.isFollowing
              ? `${data.followerDetails.username} started following you`
              : `${data.followerDetails.username} unfollowed you`,
            variant: "default",
          });
        } else if (data.followerDetails._id?.toString() === userdata._id) {
          dispatch(
            updatePosts({
              key: "UserId",
              value: data.followerDetails._id?.toString() || "",
              updates: {
                IsFollowing: data.followedDetails.isFollowing ?? false,
              },
            })
          );
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

    return () => {
      socket.off("newMessage", handleChatMessage);
      socket.off("userTyping", handleTyping);
      socket.off("userStopTyping", handleStopTyping);
      socket.off("lastActive");
      socket.off("newChat", handleChat);
      socket.off("offer");
      socket.off("post_response");
      socket.off("delete_post_response");
      socket.off("post_reaction_reponse");
      socket.off("deletePost");
      socket.off("updatePost");
      socket.off("newPost");
      socket.off("followNotification");
      socket.off("conversationUpdated");
      socket.off("reactionAdded");
      socket.off("reactionRemoved");
      socket.off("reactionUpdated");
      socket.off("chatError");
    };
  }, [socket, handleChatMessage, handleChat, handleTyping, handleStopTyping, conversations]);

  const setActiveRoute = useCallback((route: string) => {
    setActiveRouteState(route);
  }, []);

  const handleReset = () => {
    setError(null);
  };

  return (
    <>
      {displayAnnouncement.status && (
        <div id="announcement" className="relative w-screen bg-brand p-2 text-center text-white">
          <h1>{displayAnnouncement.message}</h1>
          <XCircle
            className="absolute right-3 top-1/2 -translate-y-1/2 transform cursor-pointer"
            size={20}
            onClick={() => setDisplayAnnouncement({ status: false, message: "" })}
          />
        </div>
      )}
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
            {incomingCallId && (
              <ConfirmCall id={incomingCallId} show={true} conversations={conversations} />
            )}
            {!callRoute ? (
              <Sidebar
                setLoad={setLoad}
                activeRoute={activeRoute}
                setActiveRoute={setActiveRoute}
              />
            ) : null}
            {/* <pre data-testid="client-component">{JSON.stringify(user, null, 2)}</pre>; */}
            <div id="detail" className="">
              {children}
              {showProfilePicture && <UserPhoto />}
              {showPostPreview && <PostPreview />}
              {callRoute && <VideoChat />}
            </div>
            {!pathname?.includes("posts") &&
            !pathname?.includes("chats") &&
            !routes.includes(activeRoute) &&
            !callRoute ? (
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
export default ClientComponents;
