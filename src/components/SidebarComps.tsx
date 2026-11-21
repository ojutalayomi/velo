/* eslint-disable tailwindcss/no-custom-classname */
import {
  Moon,
  Sun,
  SquarePen,
  RefreshCw,
  Bell,
  MessageCircle,
  User,
  LogIn,
  Ellipsis,
  CircleEllipsis,
  Settings2,
  House,
  Compass,
  CircleUserRound,
  Bookmark,
  ShieldCheck,
  TrendingUp,
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
    icon: House,
    label: "Home",
  },
  {
    route: "explore",
    icon: Compass,
    label: "Explore",
  },
  {
    route: "compose/post",
    icon: SquarePen,
    label: "Post",
  },
  {
    route: "chats",
    icon: MessageCircle,
    label: "Chats",
  },
  // Add other sidebar items here...
  {
    route: "profile",
    icon: CircleUserRound,
    label: "Profile",
  },
  {
    route: "general",
    icon: Settings2,
    label: "General",
  },
  {
    route: "notifications",
    icon: Bell,
    label: "Notifications",
  },
  {
    route: "bookmarks",
    icon: Bookmark,
    label: "Bookmarks",
  },
  {
    route: "trending",
    icon: TrendingUp,
    label: "Trending",
  },
  {
    route: "#",
    icon: CircleEllipsis,
    label: "More",
  },
];

/** Every nav row is exactly this tall (36px + 2px gap), so the sidebar can compute how many fit. */
export const SIDEBAR_ITEM_PITCH = 38;
const ROW = "relative mb-0.5 flex h-9 cursor-pointer items-center gap-3";
const ROW_SHELL =
  "mx-2 rounded-xl !px-[11px] !py-0 transition-colors hover:bg-slate-200/70 dark:hover:bg-zinc-800";

const CountBadge = ({ count, isCollapsed }: { count: number; isCollapsed: boolean }) => (
  <span
    className={`flex items-center justify-center rounded-full bg-brand text-[11px] font-bold leading-none text-white ${
      isCollapsed
        ? "absolute left-4 top-1 size-4 ring-2 ring-gray-50 dark:ring-zinc-900"
        : "ml-auto size-5"
    }`}
  >
    {count > 99 ? "99+" : count}
  </span>
);

export const adminSidebarItem = {
  route: "admin",
  icon: ShieldCheck,
  label: "Admin",
};

export const SidebarItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div"> & {
    item: (typeof sidebarItems)[0];
    activeRoute: string;
    handleClick: (route: string) => void;
    userdata: UserData;
    isCollapsed?: boolean;
    /** Items that did not fit in the sidebar; listed inside the "More" popover. */
    overflowItems?: (typeof sidebarItems)[0][];
    onMoreOpenChange?: (open: boolean) => void;
  }
>(
  (
    {
      item,
      activeRoute,
      handleClick,
      userdata,
      isCollapsed = false,
      overflowItems = [],
      onMoreOpenChange,
      ...props
    },
    ref
  ) => {
    const { conversations } = useSelector((state: RootState) => state.chat);
    const i = conversations?.reduce((acc, convo) => acc + convo.unread, 0) ?? 0;
    const notificationUnread = useSelector((state: RootState) => state.notifications.unreadCount);
    const isProfile = item.route === "profile";
    const route = isProfile ? userdata.username : item.route;
    const label = isProfile ? (userdata.username ? userdata.username : "Profile") : item.label;
    const isActive = activeRoute === route;

    if (item.label === "More")
      return (
        <Popover onOpenChange={onMoreOpenChange}>
          <PopoverTrigger asChild>
            <div
              id="more"
              ref={ref}
              className="sidebar ft rout dark:text-slate-200"
              data-route={route}
              aria-label="More"
              {...props}
            >
              <div className={ROW}>
                <item.icon size={25} />
                {!isCollapsed && <div>{label}</div>}
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="end"
            aria-label="More"
            collisionPadding={8}
            className="flex max-h-[var(--radix-popover-content-available-height)] w-56 flex-col overflow-y-auto rounded-xl bg-white p-2 shadow-lg dark:bg-neutral-950 dark:text-slate-200"
          >
            {overflowItems.map((overflow) => (
              <SidebarItem
                key={overflow.route}
                item={overflow}
                activeRoute={activeRoute}
                handleClick={handleClick}
                userdata={userdata}
                className="!mx-0 hover:text-brand"
              />
            ))}
          </PopoverContent>
        </Popover>
      );

    return (
      <Link href={`/${route}`} className="block">
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
          <div className={ROW} onClick={() => handleClick(route)}>
            <item.icon size={25} />
            {!isCollapsed && <div className="transition">{label}</div>}
            {item.label === "Chats" && i > 0 && <CountBadge count={i} isCollapsed={isCollapsed} />}
            {item.label === "Notifications" && notificationUnread > 0 && (
              <CountBadge count={notificationUnread} isCollapsed={isCollapsed} />
            )}
          </div>
        </div>
      </Link>
    );
  }
);

SidebarItem.displayName = "SidebarItem";

const ThemeSwitch = ({
  isDarkMode,
  onChange,
}: {
  isDarkMode: boolean;
  onChange: (isDark: boolean) => void;
}) => (
  <div className="flex items-center rounded-full bg-gray-100 p-1 dark:bg-zinc-900">
    {[
      { dark: false, label: "Light", Icon: Sun },
      { dark: true, label: "Dark", Icon: Moon },
    ].map(({ dark, label, Icon }) => (
      <button
        key={label}
        type="button"
        onClick={() => onChange(dark)}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${isDarkMode === dark ? "bg-white shadow-bar dark:bg-zinc-600 dark:shadow-bar-dark" : ""}`}
      >
        <Icon size={16} /> {label}
      </button>
    ))}
  </div>
);

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
    isDarkMode: boolean;
    onThemeChange: (isDark: boolean) => void;
  }
>(
  (
    {
      error,
      loading,
      userdata,
      pathname,
      isPopUp,
      isCollapsed = false,
      handlePopUp,
      refetchUser,
      isDarkMode,
      onThemeChange,
    },
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
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => onThemeChange(!isDarkMode)}
              className="flex items-center hover:text-brand"
            >
              {isDarkMode ? (
                <Moon size={25} className="mr-2" />
              ) : (
                <Sun size={25} className="mr-2" />
              )}
              {!isCollapsed && <div>{isDarkMode ? "Dark" : "Light"} mode</div>}
            </button>
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
              <ThemeSwitch isDarkMode={isDarkMode} onChange={onThemeChange} />
              <div className="my-2 border-t border-black/5 dark:border-white/10" />
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
    <div className="user !mx-0 !my-[.5em] w-full !justify-center !px-2 !py-1 hover:bg-slate-200 md:items-center md:!justify-between dark:hover:bg-neutral-900">
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
        className={`names hidden min-w-0 max-w-[60%] flex-1 flex-col items-start text-left ${isCollapsed ? "hidden" : "md:!flex"}`}
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
      className={`${isCollapsed ? "!shadow-none" : ""} user !mx-0 !my-[.5em] w-full !justify-center !px-2 !py-1 hover:bg-slate-200 md:items-center md:!justify-between dark:hover:bg-neutral-900`}
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
        className={`names hidden min-w-0 max-w-[60%] flex-1 flex-col items-start text-left ${isCollapsed ? "hidden" : "md:flex"}`}
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
