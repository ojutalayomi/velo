"use client";
import { Check } from "lucide-react";
import React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Statuser } from "./VerificationComponent";

interface Props {
  userdata: any;
  onClick?: any;
  selectedUsers?: any;
}

export const UserProfileLazyLoader = () => {
  return (
    <div className="flex items-center">
      <div className="relative mr-3 size-7">
        <div className="size-7 animate-pulse rounded-full bg-gray-200" />
      </div>
      <div>
        <div className="mb-1 h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );
};

const ImageContent: React.FC<Props> = ({ userdata, onClick, selectedUsers = [] }) => {

  if (!userdata._id) return <UserProfileLazyLoader />;
  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-full px-2 py-1 transition-colors duration-150 hover:bg-slate-200 tablets1:duration-300 hover:dark:bg-zinc-700"
      onClick={() => onClick(userdata._id)}
    >
      <div className="flex items-center gap-2">
        <Avatar>
          <AvatarFallback>
            {userdata.name?.slice(0, 2) ||
              `${userdata.firstname?.[0] || ""} ${userdata.lastname?.[0] || ""}`}
          </AvatarFallback>
          <AvatarImage
            src={
              userdata.displayPicture || userdata.displayPicture
                ? userdata.displayPicture
                  ? userdata.displayPicture
                  : userdata.displayPicture.includes("ila-")
                    ? ""
                    : userdata.displayPicture
                : ""
            }
            className="displayPicture mr-3 size-10 rounded-full dark:border-slate-200"
            alt="Display Picture"
          />
        </Avatar>
        <div>
          <p className="flex items-center gap-1 text-sm font-bold dark:text-slate-200">
            {userdata.name ? userdata.name : `${userdata.firstname} ${userdata.lastname}`}
            {userdata?.verified && <Statuser className="size-4" />}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            @{userdata.username ? userdata.username : "useranme"}
          </p>
        </div>
      </div>
      {selectedUsers.includes(userdata._id) && <Check size={20} className="dark:text-gray-400" />}
    </div>
  );
};
export default ImageContent;
