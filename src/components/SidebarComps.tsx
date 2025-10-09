/* eslint-disable tailwindcss/no-custom-classname */
import {
  BadgePlus,
  RefreshCw,
  Bell,
  Mail,
  User,
  LogIn,
  Ellipsis,
  CircleEllipsis,
  Settings,
  CircleHelp,
  Home,
  Search,
  User2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { ComponentPropsWithoutRef, forwardRef } from "react";
import { useSelector } from "react-redux";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserData } from "@/lib/types/user";
import { cn } from "@/lib/utils";
import { RootState } from "@/redux/store";

import { Statuser } from "./VerificationComponent";

export const sidebarItems = [
  {
    route: "home",
    icon: Home,
    label: "Home",
  },
  {
    route: "explore",
    icon: Search,
    label: "Explore",
  },
  {
    route: "compose/post",
    icon: BadgePlus,
    label: "Post",
  },
  {
    route: "chats",
    icon: Mail,
    label: "Chats",
  },
  // Add other sidebar items here...
  {
    route: "profile",
    icon: User2,
    label: "Profile",
  },
  {
    route: "general",
    icon: Settings,
    label: "General",
  },
  {
    route: "notifications",
    icon: Bell,
    label: "Notifications",
  },
  {
    route: "feedback",
    icon: CircleHelp,
    label: "Feedback",
  },
  {
    route: "#",
    icon: CircleEllipsis,
    label: "Others",
  },
];

export const SidebarItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div"> & {
    item: (typeof sidebarItems)[0];
    activeRoute: string;
    handleClick: (route: string) => void;
    userdata: UserData;
    isCollapsed?: boolean;
  }
>(({ item, activeRoute, handleClick, userdata, isCollapsed = false, ...props }, ref) => {
  const { conversations } = useSelector((state: RootState) => state.chat);
  const i = conversations?.reduce((acc, convo) => acc + convo.unread, 0) ?? 0;
  const isProfile = item.route === "profile";
  const route = isProfile ? userdata.username : item.route;
  const label = isProfile ? (userdata.username ? userdata.username : "Profile") : item.label;
  const isActive = activeRoute === route;

  if (item.label === "Others")
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div
            id={item.label.toLowerCase()}
            ref={ref}
            className={`sidebar ft rout dark:text-slate-200`}
            data-route={route}
            {...props}
          >
            <div
              className="relative my-1.5 flex cursor-pointer items-center justify-center gap-2 md:justify-start"
              onClick={() => handleClick(route)}
            >
              <item.icon />
              {!isCollapsed && <div className="hidden md:block">{label}</div>}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          aria-label="morePopOver"
          className="flex w-auto flex-col gap-4 rounded-md bg-white p-4 shadow-lg dark:bg-neutral-950 dark:text-slate-200"
        >
          {sidebarItems.slice(3, 8).map((item, key) => (
            <Link
              key={item.route + key + "l"}
              aria-label={item.route}
              className="hidden"
              href={`/${item.route}`}
            >
              <div
                className="group relative flex items-center gap-2"
                onClick={() => handleClick(route)}
              >
                <item.icon size={25} className="group-hover:text-brand" />
                <div className="group-hover:text-brand">{item.label}</div>
                {item.label === "Chats" && i > 0 && (
                  <div className="absolute right-0 flex size-5 translate-y-[-50%] items-center justify-center rounded-full bg-brand text-xs font-bold text-white md:relative md:translate-y-0">
                    {i}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </PopoverContent>
      </Popover>
    );

  return (
    <Link href={`/${route}`}>
      <div
        ref={ref}
        {...props}
        className={cn(
          `sidebar ft dark:text-slate-200 rout ${
            isActive ? "active backdrop-filter backdrop-blur-[5px]" : ""
          }`,
          props.className
        )}
        data-route={route}
        aria-label={item.route}
      >
        <div
          className="relative my-1.5 flex cursor-pointer items-center justify-center gap-2 md:justify-start"
          onClick={() => handleClick(route)}
        >
          <item.icon size={25} />
          <div className={`${!isCollapsed && "md:block"} hidden  transition`}>{label}</div>
          {item.label === "Chats" && i > 0 && (
            <div
              className={`absolute translate-x-[50%] translate-y-[-50%] bg-brand text-xs text-white ${!isCollapsed && "md:relative md:translate-y-0"} flex size-5 items-center justify-center rounded-full font-bold`}
            >
              {i}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
});

SidebarItem.displayName = "SidebarItem";

export const UserSection = forwardRef<
  HTMLDivElement,
  {
    error: any;
    loading: boolean;
    userdata: UserData;
    pathname: string;
    isPopUp: boolean;
    isCollapsed?: boolean;
    handlePopUp: () => void;
    refetchUser: () => void;
  }
>(
  (
    { error, loading, userdata, pathname, isPopUp, isCollapsed = false, handlePopUp, refetchUser },
    ref
  ) => (
    <div ref={ref} className="flex">
      {!userdata._id ? (
        loading ? (
          <UserComponentLoading
            loading={loading}
            error={error}
            isCollapsed={isCollapsed}
            refetchUser={refetchUser}
          />
        ) : (
          <div className="flex flex-col gap-4 px-1 py-2 dark:text-slate-200">
            <Link
              href={`${pathname !== "" ? "/accounts/login?backto=" + pathname : "/accounts/login"}`}
              className="flex items-center hover:text-brand"
            >
              <LogIn size={25} className="mr-2" />
              {!isCollapsed && <div className="hidden md:block">Log in</div>}
            </Link>
            <Link href="/accounts/signup" className="flex items-center hover:text-brand">
              <User size={25} className="mr-2" />
              {!isCollapsed && <div className="hidden md:block">Sign up</div>}
            </Link>
          </div>
        )
      ) : (
        <Popover open={isPopUp} onOpenChange={handlePopUp}>
          <PopoverTrigger className="flex-1">
            <div className="w-full cursor-pointer">
              <UserComponent userdata={userdata} isCollapsed={isCollapsed} />
            </div>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto rounded-md bg-white p-2 shadow-lg dark:bg-neutral-950 dark:text-slate-200"
          >
            <div className="flex flex-col">
              <Link
                href="/accounts/logout"
                className="rounded p-2 hover:bg-slate-200 dark:hover:bg-slate-900"
              >
                Log out{" "}
                <b className="username">
                  @{userdata.username !== "" ? userdata.username : "johndoe"}
                </b>
              </Link>
              <Link
                href="/accounts/login"
                className="rounded p-2 hover:bg-slate-200 dark:hover:bg-slate-900"
              >
                Add another account?
              </Link>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
);

UserSection.displayName = "UserSection";

const UserComponentLoading = ({
  loading,
  error,
  isCollapsed = false,
  refetchUser,
}: {
  loading: boolean;
  error: boolean;
  isCollapsed?: boolean;
  refetchUser: () => void;
}) => {
  return (
    <div className="user !mx-0 !my-[.5em] w-full !justify-center !px-2 !py-1 hover:bg-slate-200 md:items-center md:!justify-between md:shadow-bar dark:hover:bg-neutral-900 md:dark:shadow-bar-dark">
      <div className="img">
        {loading ? (
          <div className={`flex h-[90%] w-full items-center justify-center`}>
            <div className="loader show size-6" />
          </div>
        ) : (
          error && <RefreshCw className="cursor-pointer" size={25} onClick={refetchUser} />
        )}
      </div>

      <div
        className={`names hidden max-w-[50%] flex-1 flex-col items-center ${isCollapsed ? "hidden" : "md:!flex"}`}
      >
        <div className="flex max-w-full dark:text-slate-200">
          <div className="mb-1 h-4 w-14 animate-pulse rounded bg-[#9E9E9E]" />
        </div>

        <div className="h-4 w-14 animate-pulse rounded bg-[#9E9E9E]" />
      </div>

      <Ellipsis
        size={25}
        className={`hidden cursor-pointer ${isCollapsed ? "hidden" : "md:!block"} dark:text-gray-400`}
      />
    </div>
  );
};

const UserComponent = ({
  userdata,
  isCollapsed = false,
}: {
  userdata: UserData;
  isCollapsed?: boolean;
}) => {
  return (
    <div
      className={`${isCollapsed ? "!shadow-none" : ""} user !mx-0 !my-[.5em] w-full !justify-center !px-2 !py-1 hover:bg-slate-200 md:items-center md:!justify-between md:shadow-bar dark:hover:bg-neutral-900 md:dark:shadow-bar-dark`}
    >
      <div className="img size-10 max-h-10 max-w-10">
        <Image
          src={userdata.displayPicture ? userdata.displayPicture : "/default.jpeg"}
          onError={() => {
            userdata.displayPicture = "/default.jpeg";
          }}
          className="displayPicture size-full dark:border-slate-200"
          width={30}
          height={30}
          alt="Display Picture"
        />
      </div>

      <div
        className={`names hidden max-w-[50%] flex-1 flex-col items-center ${isCollapsed ? "hidden" : "md:flex"}`}
      >
        <div className="flex max-w-full dark:text-slate-200">
          <p className="truncate">{userdata.name}</p>
          {userdata.verified && <Statuser className="size-4" />}
        </div>
        <p className="username text-sm">@{userdata.username}</p>
      </div>

      <Ellipsis
        size={25}
        className={`hidden cursor-pointer ${isCollapsed ? "hidden" : "md:!block"} dark:text-gray-400`}
      />
    </div>
  );
};
