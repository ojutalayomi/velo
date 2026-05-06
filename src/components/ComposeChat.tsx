/* eslint-disable tailwindcss/no-custom-classname */
"use client";
import { Users, Plus, X, ArrowLeft, Ellipsis, Camera } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { useUser } from "@/app/providers/UserProvider";
import ImageContent, { UserProfileLazyLoader } from "@/components/imageContent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { useGlobalFileStorage } from "@/hooks/useFileStorage";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import type { PaginationMeta } from "@/lib/apiPagination";
import { fetchUsersSearchPage } from "@/lib/getStatus";
import { UserData } from "@/lib/types/user";
import { ConvoType, setNewGroupMembers } from "@/redux/chatSlice";
import { useAppDispatch } from "@/redux/hooks";
import { showChat } from "@/redux/navigationSlice";
import { RootState } from "@/redux/store";
import { UserDataPartial } from "@/redux/userSlice";

import { Dialog, DialogContent } from "./ui/dialog";

type Props = UserData[];

const DirectChatMenu = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const navigate = useNavigateWithHistory();
  const { userdata, loading } = useUser();
  const { conversations } = useSelector((state: RootState) => state.chat);
  const [searchQuery, setSearchQuery] = useState("");
  const [noUser, setNoUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Props>([]);
  const [peoplePaging, setPeoplePaging] = useState<PaginationMeta | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);

  const openChat = (_id: string) => {
    const existingConvo = conversations.find((convo) =>
      _id === userdata._id
        ? convo.participants.length === 1 && convo.participants.includes(_id)
        : convo.participants.length === 2 && convo.participants.includes(_id)
    );
    setIsDisabled(true);
    if (existingConvo) {
      router.replace(`/chats/${existingConvo.id}`);
    } else if (_id === userdata._id) {
      router.replace(`/chats/me`);
    } else {
      router.replace(`/chats/new?otherId=${_id}`);
    }
    dispatch(showChat(""));
  };

  useEffect(() => {
    dispatch(showChat(""));
  }, [dispatch]);

  const mergePeopleRows = useCallback((rows: Props, extras: Props) => {
    const ids = new Set(rows.map((r) => String(r._id)));
    const add = extras.filter((r) => !ids.has(String(r._id)));
    return [...rows, ...add];
  }, []);

  const handleDmSearchChange = async (raw: string) => {
    const cleaned = raw.replace(/[^a-zA-Z0-9\s]/g, "");
    setSearchQuery(cleaned);
    setNoUser(false);

    if (cleaned.trim() === "") {
      setResults([]);
      setPeoplePaging(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const page = await fetchUsersSearchPage(cleaned, 0, 15);
      const data = page.data as unknown as UserData[];
      setNoUser(data.length < 1);
      const filtered = data.filter((user) => user.username !== userdata.username);
      setResults(filtered);
      setPeoplePaging(page.pagination);
    } catch (error) {
      console.error("Error searching people:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreDmPeople = async () => {
    if (
      !peoplePaging?.hasMore ||
      isLoading ||
      searchQuery.trim() === ""
    ) {
      return;
    }
    setIsLoading(true);
    try {
      const skip = peoplePaging.skip + peoplePaging.limit;
      const page = await fetchUsersSearchPage(searchQuery, skip, peoplePaging.limit);
      const chunk = page.data as unknown as UserData[];
      const filtered = chunk.filter((user) => user.username !== userdata.username);
      setResults((prev) => mergePeopleRows(prev, filtered));
      setPeoplePaging(page.pagination);
      if (filtered.length === 0 && !page.pagination.hasMore) setNoUser(true);
    } catch (error) {
      console.error("Error searching people:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const keyHolder = [
    {
      tag: "Create New Group",
      icon: (
        <Users size={28} className="mr-3 rounded-full border-2 border-gray-400 text-gray-400" />
      ),
      icon2: <Plus size={28} className="text-brand" />,
    },
  ];
  return (
    <>
      <div
        className={`sticky top-0 flex w-full items-center justify-between gap-4 bg-white px-3 py-2 sm:!bg-transparent dark:bg-zinc-900`}
      >
        <ArrowLeft
          onClick={() => {
            dispatch(showChat(""));
            navigate();
          }}
          className="icon-arrow-left max-h-[21px] cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        />
        <div className="flex flex-grow items-center gap-3 rounded-full px-3 py-1 shadow-bar dark:shadow-bar-dark dark:shadow-slate-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
          >
            <path
              className="dark:fill-slate-200"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8.68945 1C12.9293 1 16.3781 4.3727 16.3781 8.51907C16.3781 10.4753 15.6104 12.2595 14.3542 13.5986L16.8261 16.0109C17.0574 16.2371 17.0582 16.6031 16.8269 16.8294C16.7116 16.9436 16.5592 17 16.4076 17C16.2568 17 16.1052 16.9436 15.9892 16.8309L13.4874 14.3912C12.1714 15.4219 10.5028 16.0389 8.68945 16.0389C4.44955 16.0389 1 12.6655 1 8.51907C1 4.3727 4.44955 1 8.68945 1ZM8.68945 2.15821C5.10251 2.15821 2.18433 5.01125 2.18433 8.51907C2.18433 12.0269 5.10251 14.8807 8.68945 14.8807C12.2756 14.8807 15.1938 12.0269 15.1938 8.51907C15.1938 5.01125 12.2756 2.15821 8.68945 2.15821Z"
              fill="#78828A"
            ></path>
          </svg>
          <input
            className="w-full border-0 bg-transparent outline-0 dark:text-slate-200"
            value={searchQuery}
            onChange={(e) => void handleDmSearchChange(e.target.value)}
            type="text"
            placeholder="Search for people..."
          />
        </div>
        <Ellipsis className="icon-arrow-left max-h-[21px] cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200" />
      </div>
      {keyHolder.map((attr, key) => (
        <div
          key={key}
          className="my-3 flex cursor-pointer items-center justify-between px-3"
          onClick={() => {
            if (attr.tag === "Create New Group") {
              router.push(`/chats/compose?type=group`);
            }
          }}
        >
          <div className="flex items-center">
            {attr.icon}
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-slate-200">{attr.tag}</p>
            </div>
          </div>
          <button className="flex flex-col items-center font-semibold text-brand">
            {attr.icon2}
          </button>
        </div>
      ))}
      <div className="my-3 flex flex-col items-start gap-2 px-3">
        <div className="text-sm dark:text-slate-200">You</div>
        {loading ? (
          <UserProfileLazyLoader />
        ) : (
          <ImageContent userdata={userdata} onClick={openChat} />
        )}
        {noUser ? (
          <div className="text-sm dark:text-slate-200">
            <p>Oops! No user found</p>
            <p>Check for correct spelling.</p>
          </div>
        ) : results.length > 1 ? (
          <div className="text-sm dark:text-slate-200">Others</div>
        ) : (
          ""
        )}
        <div
          className={`overflow-y-auto ${isDisabled ? "pointer-events-none cursor-not-allowed opacity-50" : ""}`}
        >
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <UserProfileLazyLoader key={index} />
              ))}
            </div>
          ) : (
            results.map((person: any, index: any) => (
              <ImageContent key={index} userdata={person} onClick={openChat} />
            ))
          )}
          {peoplePaging?.hasMore && !isLoading ? (
            <button
              type="button"
              className="text-sm font-medium text-brand"
              onClick={() => void loadMoreDmPeople()}
            >
              Load more
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
};

const GroupChatMenu = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const navigate = useNavigateWithHistory();
  const { userdata } = useUser();
  const { conversations } = useSelector((state: RootState) => state.chat);
  const [searchQuery, setSearchQuery] = useState("");
  const [noUser, setNoUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Props>([]);
  const [groupPeoplePaging, setGroupPeoplePaging] = useState<PaginationMeta | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<UserDataPartial[]>([]);
  const [selectedUsersIds, setSelectedUsersIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setGroupDisplayPicture } = useGlobalFileStorage();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupDisplayPicture(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const createNewChat = async () => {
    dispatch(setNewGroupMembers(selectedUsers));

    try {
      router.replace(
        `/chats/new?type=group&groupName=${groupName}&groupDescription=${groupDescription}`
      );
      dispatch(showChat(""));
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleUserSelection = (_id: string) => {
    const filteredResults = results.filter((user: UserData) => user._id === _id);
    const newData = _id === userdata._id ? userdata : filteredResults[0];

    setSelectedUsers((prevUsers) => {
      const isAlreadySelected = prevUsers.some((user) => user._id === _id);
      if (isAlreadySelected) {
        return prevUsers.filter((user) => user._id !== _id);
      } else {
        return [...prevUsers, newData];
      }
    });
    setSelectedUsersIds((prevIds) => {
      const isAlreadySelected = prevIds.includes(_id);
      if (isAlreadySelected) {
        return prevIds.filter((id) => id !== _id);
      } else {
        return [...prevIds, _id];
      }
    });
  };

  const createGroup = () => {
    if (selectedUsers.length < 2) {
      toast({
        title: "Please select at least 2 users to create a group",
        description: "You need at least 2 users to create a group",
        variant: "destructive",
      });
      return;
    }
    createNewChat();
  };

  useEffect(() => {
    dispatch(showChat(""));
  }, [dispatch]);

  const mergeGroupRows = useCallback((rows: Props, extras: Props) => {
    const ids = new Set(rows.map((r) => String(r._id)));
    const add = extras.filter((r) => !ids.has(String(r._id)));
    return [...rows, ...add];
  }, []);

  const handleGroupPeopleSearchChange = async (raw: string) => {
    const cleaned = raw.replace(/[^a-zA-Z0-9\s]/g, "");
    setSearchQuery(cleaned);
    setNoUser(false);
    if (cleaned.trim() === "") {
      setResults([]);
      setGroupPeoplePaging(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const page = await fetchUsersSearchPage(cleaned, 0, 15);
      const data = page.data as unknown as UserData[];
      setNoUser(data.length < 1);
      const filtered = data.filter((user) => user.username !== userdata.username);
      setResults(filtered);
      setGroupPeoplePaging(page.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreGroupPeople = async () => {
    if (!groupPeoplePaging?.hasMore || isLoading || searchQuery.trim() === "") return;
    setIsLoading(true);
    try {
      const skip = groupPeoplePaging.skip + groupPeoplePaging.limit;
      const page = await fetchUsersSearchPage(searchQuery, skip, groupPeoplePaging.limit);
      const chunk = (page.data as unknown as UserData[]).filter(
        (user) => user.username !== userdata.username
      );
      setResults((prev) => mergeGroupRows(prev, chunk));
      setGroupPeoplePaging(page.pagination);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userdata._id) {
      setSelectedUsersIds([String(userdata._id)]);
      setSelectedUsers([userdata as UserDataPartial]);
    }
  }, [userdata._id]);

  return (
    <>
      <div
        className={`sticky top-0 z-10 flex w-full items-center justify-between gap-4 bg-white px-3 py-2 sm:!bg-transparent sm:backdrop-blur-sm dark:bg-zinc-900`}
      >
        <ArrowLeft
          onClick={() => {
            dispatch(showChat(""));
            navigate();
          }}
          className="icon-arrow-left max-h-[21px] cursor-pointer text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        />
        <h2 className="text-center text-sm font-semibold dark:text-slate-200">Create New Group</h2>
        <button
          disabled={groupName.trim() === ""}
          onClick={createGroup}
          className="hover:bg-brand-dark rounded-md bg-brand px-4 py-1 text-sm font-medium text-white transition-colors duration-300 ease-in-out disabled:bg-gray-400"
        >
          Create
        </button>
      </div>
      <div className="my-3 flex flex-col gap-2 px-3">
        <div className="mb-4 flex justify-center">
          <div
            onClick={handleImageClick}
            className="relative size-24 cursor-pointer overflow-hidden rounded-full border-2 border-gray-200 transition-colors duration-300 hover:border-brand dark:border-gray-700"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Group preview" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                <Users size={32} className="text-gray-400" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 transition-opacity duration-300 hover:bg-opacity-30">
              <Camera
                size={24}
                className="text-white opacity-0 transition-opacity duration-300 hover:opacity-100"
              />
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
        <div className="flex flex-grow items-center gap-3 rounded-full px-3 py-1 shadow-bar dark:shadow-bar-dark dark:shadow-slate-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
          >
            <path
              className="dark:fill-slate-200"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8.68945 1C12.9293 1 16.3781 4.3727 16.3781 8.51907C16.3781 10.4753 15.6104 12.2595 14.3542 13.5986L16.8261 16.0109C17.0574 16.2371 17.0582 16.6031 16.8269 16.8294C16.7116 16.9436 16.5592 17 16.4076 17C16.2568 17 16.1052 16.9436 15.9892 16.8309L13.4874 14.3912C12.1714 15.4219 10.5028 16.0389 8.68945 16.0389C4.44955 16.0389 1 12.6655 1 8.51907C1 4.3727 4.44955 1 8.68945 1ZM8.68945 2.15821C5.10251 2.15821 2.18433 5.01125 2.18433 8.51907C2.18433 12.0269 5.10251 14.8807 8.68945 14.8807C12.2756 14.8807 15.1938 12.0269 15.1938 8.51907C15.1938 5.01125 12.2756 2.15821 8.68945 2.15821Z"
              fill="#78828A"
            ></path>
          </svg>
          <input
            className="w-full border-0 bg-transparent outline-0 dark:text-slate-200"
            value={searchQuery}
            onChange={(e) => void handleGroupPeopleSearchChange(e.target.value)}
            type="text"
            placeholder="Search for people..."
          />
        </div>
        <div className="mt-2 flex flex-grow items-center gap-3 rounded-full px-3 py-1 shadow-bar dark:shadow-bar-dark dark:shadow-slate-200">
          <Users size={18} className="text-gray-500 dark:text-gray-400" />
          <input
            className="w-full border-0 bg-transparent outline-0 dark:text-slate-200"
            type="text"
            placeholder="Enter group name..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>
        <div className="mt-2 flex flex-grow items-center gap-3 rounded-lg px-3 py-1 shadow-bar dark:shadow-bar-dark dark:shadow-slate-200">
          <textarea
            className="w-full border-0 bg-transparent outline-0 dark:text-slate-200"
            placeholder="Enter group description..."
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
          />
        </div>
        <div className="text-center text-sm dark:text-slate-200">Add people to your group</div>
        {noUser && (
          <div className="text-sm dark:text-slate-200">
            <p>Oops! No user found</p>
            <p>Check for correct spelling.</p>
          </div>
        )}
        {selectedUsers.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 border-b pb-4 dark:border-gray-700">
              {selectedUsers.map((user) => (
                <div
                  key={String(user._id)}
                  className="flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1 shadow dark:bg-zinc-900"
                >
                  <Avatar>
                    <AvatarFallback className="shadow-inner">
                      {user.name?.slice(0, 2) ||
                        `${user.firstname?.[0] || ""} ${user.lastname?.[0] || ""}`}
                    </AvatarFallback>
                    <AvatarImage
                      src={user.displayPicture || ""}
                      className="mr-2 rounded-full shadow-inner"
                      alt={user.name || `${user.firstname} ${user.lastname}`}
                    />
                  </Avatar>
                  <span className="text-sm dark:text-slate-200">
                    {user.name || `${user.firstname} ${user.lastname}`}
                  </span>
                  {user._id !== userdata._id && (
                    <button
                      onClick={() => toggleUserSelection(user._id as string)}
                      className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="overflow-y-auto">
          <div className="my-3 flex flex-col items-start gap-2">
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <UserProfileLazyLoader key={index} />
                ))}
              </div>
            ) : (
              <>
                {results.length > 0 && <div className="text-sm dark:text-slate-200">Others</div>}
                {results.map((person: any, index: any) => (
                  <ImageContent
                    key={index}
                    userdata={person}
                    onClick={toggleUserSelection}
                    selectedUsers={selectedUsersIds}
                  />
                ))}
              </>
            )}
            {groupPeoplePaging?.hasMore && !isLoading ? (
              <button
                type="button"
                className="mt-2 text-sm font-medium text-brand"
                onClick={() => void loadMoreGroupPeople()}
              >
                Load more
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

const NewChatMenuClient = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams?.get("type") || "direct";
  return (
    <Dialog open={pathname?.includes("chats/compose")} onOpenChange={() => {}}>
      <DialogContent
        className="block h-screen w-screen overflow-auto p-0 sm:grid sm:!h-min sm:!max-h-[90vh] sm:w-full sm:!max-w-lg sm:p-4"
        closeBtn={false}
      >
        {type === "direct" ? <DirectChatMenu /> : <GroupChatMenu />}
      </DialogContent>
    </Dialog>
  );
};

export default function NewChatMenu() {
  return (
    <Suspense fallback={<></>}>
      <NewChatMenuClient />
    </Suspense>
  );
}
