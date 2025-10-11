"use client";
import { ObjectId } from "bson";
import { Search } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { useUser } from "@/app/providers/UserProvider";
import { Footer } from "@/components/Footer";
import ImageContent, { UserProfileLazyLoader } from "@/components/imageContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { axiosApi } from "@/lib/api";
import { SocialMediaUser } from "@/lib/class/User";
import { cn } from "@/lib/utils";
import { RootState } from "@/redux/store";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";



const RightSideBar = ({ className, ...props }: { className?: string; props?: HTMLDivElement }) => {
  const { userdata } = useUser();
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<SocialMediaUser[]>([]);
  const { onlineUsers } = useSelector((state: RootState) => state.utils);
  useEffect(() => {
    // Only fetch if userdata._id exists to avoid running the effect twice (once with undefined, once with real id)
    if (!userdata._id) return;

    setLoading(true);
    axiosApi("/api")
      .get("/users?getSuggestions=true&limit=10")
      .then((suggestions) => {
        setSuggestions(
          suggestions.data.filter(
            (d: SocialMediaUser) =>
              d.isFollowing === false && d._id.toString() !== userdata._id.toString()
          )
        );
      })
      .catch((error) => {
        console.error("Error fetching suggestions:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userdata._id]);

  function handleFollow(_id: ObjectId): void {
    console.log(_id);
  }

  return (
    <div
      className={cn(
        "min-h-screen hidden md:block flex-1 dark:bg-zinc-900 dark:text-slate-200 bg-gray-50",
        className
      )}
      {...props}
    >
      <div className="mx-auto max-h-full max-w-md space-y-2 overflow-auto">
        {/* Search Bar */}
        <div className="sticky top-0 w-full bg-gray-50 px-4 py-2 dark:bg-zinc-900">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
              size={18}
            />
            <Input
              type="text"
              placeholder="Search people"
              className="w-full rounded-xl border-0 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:ring-2 focus:ring-brand/20 dark:bg-zinc-800"
            />
          </div>
        </div>

        {/* User Profile */}
        <div className="mx-4">
          <ImageContent userdata={userdata} />
        </div>

        {/* Suggestions Section */}
        <div className="mx-4 max-h-[70%] overflow-auto rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-800">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Suggested for you</h2>
            <a href="#" className="text-sm text-brand transition-colors hover:text-brand/80">
              See All
            </a>
          </div>

          <div className="space-y-4">
            {loading ? (
              <RenderLoadingPlaceholder />
            ) : (
              suggestions.map((suggestion, index) => (
                <Link key={suggestion._id.toString()} href={`/${suggestion.username}`} className="group flex items-center justify-between gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={suggestion.displayPicture} className="rounded-full object-cover" />
                      <AvatarFallback>
                        {suggestion.username?.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {onlineUsers.includes(suggestion?._id.toString()) && (
                      <div className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-white bg-green-500 dark:border-zinc-800"></div>
                    )}
                  </div>
                  <div className="flex-1 overflow-auto">
                    <div>
                      <p className="truncate text-sm font-medium">{suggestion.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {index === 3 ? "New to Velo" : "Suggested for you"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={"link"}
                    className="text-sm font-medium text-brand transition-colors hover:text-brand/80"
                    onClick={(e) => {
                      e.preventDefault();
                      handleFollow(suggestion._id);
                    }}
                  >
                    Follow
                  </Button>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default RightSideBar;


function RenderLoadingPlaceholder() {
  return (
    <div className="flex cursor-progress flex-col space-y-3">
      {[...Array(6)].map((_, i) => (
        <UserProfileLazyLoader key={i++} />
      ))} 
    </div>
  );
}