/* eslint-disable tailwindcss/no-custom-classname */
"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { EllipsisVertical, UserMinus2, UserPlus2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Statuser } from "@/components/VerificationComponent";
import { toast } from "@/hooks/use-toast";
import { useGlobalFileStorage } from "@/hooks/useFileStorage";
import { ChatMessage } from "@/lib/class/ChatMessage";
import ChatRepository from "@/lib/class/ChatRepository";
import ChatSystem from "@/lib/class/chatSystem";
import { Attachment, ChatType, MessageType, msgStatus } from "@/lib/types/type";
import { UserData } from "@/lib/types/user";
import { timeFormatter as timeFormatterUtils } from "@/lib/utils";
import { updateConversation, addMessage, setNewGroupMembers } from "@/redux/chatSlice";
import { useAppDispatch } from "@/redux/hooks";
import { showChat } from "@/redux/navigationSlice";
import { RootState } from "@/redux/store";
import { UserDataPartial } from "@/redux/userSlice";
import { clearSelectedMessages } from "@/redux/utilsSlice";
import { formatNo, timeFormatter } from "@/templates/PostProps";

import ChatTextarea from "../ChatTextarea";

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

const chatRepository = new ChatRepository();

const chatSystem = new ChatSystem(chatRepository);

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

const ChatPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const otherId = searchParams?.get("otherId") as string;
  const type = (searchParams?.get("type") as string) || "DM";
  const groupName = searchParams?.get("groupName") as string;
  const groupDescription = searchParams?.get("groupDescription") as string;
  const dispatch = useAppDispatch();
  const { userdata } = useUser();
  const { newGroupMembers } = useSelector((state: RootState) => state.chat);
  const { onlineUsers } = useSelector((state: RootState) => state.utils);
  const { groupDisplayPicture } = useGlobalFileStorage();
  const [quote, setQuote] = useState<QuoteProp>(initialQuoteState);
  const [load, setLoading] = useState<boolean>();
  const [newMessage, setNewMessage] = useState("");
  const [newPerson, setNewPerson] = useState<UserData | undefined>();
  const socket = useSocket();
  const { chaT } = useSelector((state: RootState) => state.navigation);
  const messageBoxRef = useRef<HTMLDivElement>(null);
  const { files: attachments, clearFiles } = useGlobalFileStorage();
  const [allowSend, setAllowSend] = useState<boolean>(true);

  const [chatData, setChatData] = useState<{
    name: string;
    displayPicture: string;
    description: string;
    verified: boolean;
    isGroup: boolean;
    members?: UserDataPartial[];
  }>({
    name: "",
    displayPicture: "",
    description: "",
    verified: false,
    isGroup: false,
    members: [],
  });

  useEffect(() => {
    if (type === "group") {
      setChatData({
        name: groupName || "",
        displayPicture: groupDisplayPicture ? URL.createObjectURL(groupDisplayPicture) : "",
        description: groupDescription || "",
        verified: false,
        isGroup: true,
        members: newGroupMembers,
      });
    } else if (newPerson) {
      setChatData({
        name: newPerson.name || "",
        displayPicture: newPerson.displayPicture || "",
        description: newPerson.bio || "",
        verified: newPerson.verified || false,
        isGroup: false,
      });
    }
  }, [type, groupName, groupDescription, newGroupMembers, newPerson, groupDisplayPicture]);

  useEffect(() => {
    dispatch(showChat(""));
  }, [dispatch]);

  const fetchData = useCallback(async () => {
    setLoading(true);

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
      if (otherId) {
        const cachedData = getCachedData(otherId);
        if (cachedData) {
          setNewPerson(cachedData);
        } else {
          const apiData = await fetchFromAPI(otherId);
          setNewPerson(apiData);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [otherId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, otherId]);

  const handleSendMessage = async (id: string) => {
    if (!allowSend) return;
    if (newMessage.trim() === "" && attachments.length === 0) {
      return;
    }

    try {
      setAllowSend(false);

      // Prepare the message object
      const msg = new ChatMessage({
        _id: generateObjectId(),
        chatId: generateObjectId(),
        sender: {
          id: String(userdata._id),
          name: userdata.name,
          displayPicture: userdata.displayPicture,
          verified: userdata.verified,
          username: userdata.username,
        },
        receiverId: otherId,
        content: newMessage,
        timestamp: new Date().toISOString(),
        chatType: type === "group" ? "Group" : "DM",
        messageType: "Text" as MessageType,
        reactions: [],
        attachments: [] as Attachment[],
        quotedMessageId: id,
        status: "sending" as msgStatus,
      });
      msg.receiverId = type === "group" ? msg.chatId : String(userdata._id);

      let displayPictureUrl = "";

      if (type === "group" && groupDisplayPicture) {
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: groupDisplayPicture.name,
            contentType: groupDisplayPicture.type,
            bucketName: "profile-display-images",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { url, fields } = await response.json();
        const formData = new FormData();

        for (const key in fields) {
          formData.append(key, fields[key]);
        }

        formData.append("file", groupDisplayPicture);

        const uploadResponse = await fetch(url, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image");
        }

        displayPictureUrl = url + fields.key;
      }

      if (attachments.length) {
        // Read and process all files
        const fileReadPromises = attachments.map((file) => {
          return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const fileData = reader.result as ArrayBuffer;
              msg.attachments.push({
                key: timeFormatterUtils() + "/" + file.name,
                name: file.name,
                type: file.type,
                data: Array.from(new Uint8Array(fileData)),
                size: file.size,
                lastModified: new Date(file.lastModified).toISOString(),
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

      const createNameAttribute = () => {
        if (type === "group") {
          return { group: groupName };
        }
        return {
          [String(userdata._id)]: userdata.name,
          ...(newPerson && { [`${newPerson._id}`]: newPerson.name || "" }),
        };
      };

      const createParticipants = () => {
        if (type === "DM") {
          return [userdata._id as string, `${newPerson?._id}`];
        }
        if (type === "group") {
          return newGroupMembers.map((member: UserDataPartial) => member._id as unknown as string);
        }
        return newPerson && `${newPerson._id}` !== userdata._id ? [`${newPerson._id}`] : [];
      };

      const createParticipantsImg = () => {
        if (type === "DM") {
          return {
            [String(userdata._id)]: userdata.displayPicture,
            [`${newPerson?._id}`]: newPerson?.displayPicture,
          };
        }
        if (type === "group") {
          return Object.assign(
            {},
            ...newGroupMembers.map((member) => ({
              [`${member._id}`]:
                member._id === userdata._id ? userdata.displayPicture : member.displayPicture,
            }))
          );
        }
        return newPerson && `${newPerson._id}` !== userdata._id
          ? {
              [`${newPerson._id}`]: newPerson.displayPicture,
            }
          : {};
      };

      const createUnreadCounts = () => {
        if (type === "DM") {
          return { [String(userdata._id)]: 0, [`${newPerson?._id}`]: 1 };
        }
        if (type === "group") {
          return Object.assign(
            {},
            ...newGroupMembers.map((member: UserDataPartial) => ({
              [`${member._id}`]: 1,
            }))
          );
        }
        return newPerson && `${newPerson._id}` !== userdata._id
          ? {
              [`${newPerson._id}`]: 1,
            }
          : {};
      };

      const newChatAttributes = {
        _id: msg.chatId,
        name: createNameAttribute(),
        chatType: type === "group" ? ("Group" as ChatType) : ("DM" as ChatType),
        participants: createParticipants(),
        groupDescription: groupDescription || "",
        groupDisplayPicture: displayPictureUrl || "",
        adminIds: [String(userdata._id)],
        inviteLink: "",
        isPrivate: false,
        participantsImg: createParticipantsImg(),
        lastMessageId: msg._id,
        unreadCounts: createUnreadCounts(),
        favorite: false,
        pinned: false,
        deleted: false,
        archived: false,
        msg,
      };

      const result = await chatSystem.addChat(newChatAttributes);
      if (!result) {
        toast({
          title: "Error",
          description: "Failed to create chat. Please try again.",
          variant: "destructive",
        });
        return;
      }

      dispatch(addMessage(msgCopy));
      dispatch(
        updateConversation({
          id: msg.chatId,
          updates: {
            unread: 1,
            lastMessage: msg.content,
            lastUpdated: msg.timestamp,
          },
        })
      );

      // Reset the message input and attachments
      setNewMessage("");
      clearFiles();
      closeQuote();
      const txt = document.getElementById("txt");
      if (txt) txt.style.height = "38px";

      dispatch(setNewGroupMembers([]));
      router.push(`/chats/${result.chat.chatType === "Group" ? "group/" : ""}${result.chat._id}`);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAllowSend(true);
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

  const options = [{ id: 1, name: "View contact", action: () => console.log("View contact") }];

  return (
    <div
      className={`bg-bgLight tablets1:flex ${chaT} z-10 flex size-full max-h-screen min-h-screen flex-1 flex-col overflow-hidden rounded-lg shadow-md tablets1:z-[unset] tablets1:w-auto mobile:absolute dark:bg-bgDark`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-gray-100 px-3 py-2 dark:bg-zinc-900 dark:text-slate-200">
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
                <div className="truncate">{chatData.name}</div>
                {chatData.verified && <Statuser className="ml-1 size-4" />}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {chatData.isGroup
                  ? "New group"
                  : onlineUsers.includes(newPerson?._id?.toString() || "")
                    ? "Online"
                    : "New chat"}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      <div
        ref={messageBoxRef}
        className="flex flex-1 scroll-pt-20 flex-col overflow-y-auto px-2 pb-12 pt-4 backdrop-blur-sm"
      >
        <div className="relative flex cursor-pointer flex-col items-center gap-2">
          {load ? (
            <div className="size-20 animate-pulse rounded-full bg-gray-200" />
          ) : (
            <>
              <div className="relative">
                <Avatar className="size-20">
                  <AvatarFallback className="capitalize">
                    {chatData.name?.slice(0, 2)}
                  </AvatarFallback>
                  <AvatarImage
                    data-src={chatData.displayPicture}
                    src={chatData.displayPicture || "/default.jpeg"}
                    className="displayPicture size-20 rounded-full object-cover dark:border-slate-200"
                    width={80}
                    height={80}
                    alt="Display Picture"
                  />
                </Avatar>
              </div>
            </>
          )}

          <div className="max-w-full space-y-2 text-center">
            <div className="flex items-center justify-center gap-1">
              {load ? (
                <span className="h-5 w-24 animate-pulse rounded bg-gray-200" />
              ) : (
                <>
                  <h2 className="text-base font-bold dark:text-slate-200">
                    {chatData.name || (
                      <span className="h-5 w-24 animate-pulse rounded bg-gray-200" />
                    )}
                  </h2>
                  {chatData.verified && <Statuser className="size-4" />}
                </>
              )}
            </div>

            <div className="space-y-1">
              {!chatData.isGroup &&
                (load || !newPerson?.username ? (
                  <Skeleton className="mx-auto h-4 w-24" />
                ) : (
                  <Link
                    href={`/${newPerson.username}`}
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    @{newPerson.username}
                  </Link>
                ))}

              {load || chatData.description === undefined ? (
                <Skeleton className="mx-auto block h-4 w-36" />
              ) : (
                <p className="max-w-full break-words text-sm text-gray-600 dark:text-gray-400">
                  {chatData.description}
                </p>
              )}
            </div>

            {!chatData.isGroup && otherId && (
              <>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    {load || newPerson?.followers === undefined ? (
                      <Skeleton className="block h-4 w-16" />
                    ) : (
                      <p>{formatNo(newPerson?.followers || 0)} followers</p>
                    )}
                  </div>

                  <div>
                    {load || newPerson?.following === undefined ? (
                      <Skeleton className="block h-4 w-16" />
                    ) : (
                      <p>{formatNo(newPerson?.following || 0)} following</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {newPerson?.time && <p>Joined {timeFormatter(newPerson?.time, false)}</p>}
                </div>
                {load || newPerson?.isFollowing === undefined ? (
                  <Skeleton className="block h-4 w-36" />
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Button className="bg-brand text-white hover:bg-brand/95">
                      {newPerson?.isFollowing ? (
                        <>
                          <UserPlus2 className="size-4" />
                          Follow
                        </>
                      ) : (
                        <>
                          <UserMinus2 className="size-4" />
                          Unfollow
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="my-4 flex-1"></div>
      </div>

      <ChatTextarea
        quote={quote}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        handleSendMessage={handleSendMessage}
        closeQuote={closeQuote}
      />
    </div>
  );
};

export default ChatPage;
