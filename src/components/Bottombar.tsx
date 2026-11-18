"use client";
import {
  Bell,
  User,
  LogIn,
  SquarePen,
  MessageCircle,
  Settings2,
  House,
  Compass,
  Bookmark,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { useUser } from "@/app/providers/UserProvider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerTitle,
  DrawerContent,
  DrawerFooter,
  DrawerTrigger,
  DrawerHeader,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RootState } from "@/redux/store";

import { Statuser } from "./VerificationComponent";

interface BottombarProps {
  activeRoute: string;
  isMoreShown: boolean;
  setActiveRoute: (status: string) => void;
  setLoad: (status: boolean) => void;
  setMoreStatus: (status: boolean) => void;
}

const Root: React.FC<BottombarProps> = ({
  setLoad,
  activeRoute,
  isMoreShown,
  setActiveRoute,
  setMoreStatus,
}) => {
  const { userdata, loading } = useUser();
  const { conversations } = useSelector((state: RootState) => state.chat);
  let i = 0;
  conversations?.map((convo) => {
    i = i + convo.unread;
  });
  const notificationUnread = useSelector(
    (state: RootState) => state.notifications.unreadCount
  );
  const [isPopUp, setPopUp] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const ref1 = useRef<HTMLDivElement>(null);
  const routes = [
    "accounts/login",
    "accounts/signup",
    "accounts/forgot-password",
    "accounts/reset-password",
    "explore/reel",
  ];

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setPopUp(false);
      }
      if (ref1.current && !ref1.current.contains(event.target as Node)) {
        setMoreStatus(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [setMoreStatus]);

  const [hideBar, setHideBar] = useState<boolean>(false);
  useEffect(() => {
    const last = new WeakMap<object, number>();
    const onScroll = (e: Event) => {
      const t = e.target as any;
      const el = t === document ? document.scrollingElement : t;
      if (!el || typeof el.scrollTop !== "number") return;
      const prev = last.get(el) ?? 0;
      const cur = el.scrollTop;
      if (Math.abs(cur - prev) < 10) return;
      setHideBar(cur > prev && cur > 80);
      last.set(el, cur);
    };
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, []);

  useEffect(() => {
    // console.log(location)
    pathname === "/" ? router.push("/home") : null;
    // setPreviousLocation(location.pathname);
    setActiveRoute(pathname?.slice(1) || "");
  }, [pathname, setActiveRoute, router]);

  const handleClick = (route: string) => {
    setLoad(true);
    setOpen(false);
    router.push("/" + route);
    setActiveRoute(route);
    setMoreStatus(false);
  };

  const handlePopUp = () => {
    setPopUp(!isPopUp);
  };

  const handleClickMore = (command: string) => {
    command === "close" ? setMoreStatus(false) : setMoreStatus(true);
  };

  return (
    <>
      {/* Floating compose button, like X */}
      <button
        aria-label="Compose post"
        onClick={() => handleClick("compose/post")}
        className={`fixed bottom-20 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-lg tablets:hidden ${hideBar ? "translate-y-16" : ""} transition-transform duration-200 ${(routes.includes(activeRoute) || pathname?.includes("/accounts") || pathname?.includes("/compose") || pathname?.includes("/chats")) && "hidden"}`}
      >
        <SquarePen size={24} />
      </button>
      <div
        className={`fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 backdrop-blur transition-transform duration-200 tablets:hidden dark:bg-zinc-900/95 ${hideBar ? "translate-y-full" : ""} ${(routes.includes(activeRoute) || pathname?.includes("/accounts")) && "hidden"}`}
      >
        <div className="flex w-full items-center justify-evenly py-[10px] !shadow-none">
          {[
            { route: "home", Icon: House, filled: true },
            { route: "explore", Icon: Compass, filled: false },
            { route: "notifications", Icon: Bell, filled: true, badge: notificationUnread },
            { route: "chats", Icon: MessageCircle, filled: true, badge: i },
          ].map(({ route, Icon, filled, badge }) => {
            const active = activeRoute === route;
            return (
              <div
                key={route}
                onClick={() => handleClick(route)}
                className="relative flex cursor-pointer flex-col items-center justify-center p-1 dark:text-slate-200"
              >
                <Icon
                  size={26}
                  strokeWidth={active ? 2.75 : 1.75}
                  fill={active && filled ? "currentColor" : "none"}
                />
                {badge ? (
                  <div className="absolute right-0 top-0 flex h-4 min-w-4 translate-x-1/3 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </div>
                ) : null}
              </div>
            );
          })}
          {!loading ? (
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerTrigger>
                <Avatar>
                  <AvatarImage src={userdata.displayPicture} />
                  <AvatarFallback className="size-10">
                    {userdata.firstname.charAt(0).toUpperCase() || "V"}
                  </AvatarFallback>
                </Avatar>
              </DrawerTrigger>
              <DrawerContent className="tablets1:hidden">
                <DrawerHeader className="sr-only">
                  <DrawerTitle>Velo Menu</DrawerTitle>
                  <DrawerDescription>Explore your profile and settings</DrawerDescription>
                </DrawerHeader>
                {!userdata._id ? (
                  <div className="flex flex-col gap-3 px-6 pb-8 pt-4">
                    <p className="text-lg font-bold dark:text-slate-200">Join Velo</p>
                    <Link
                      href="/accounts/login"
                      className="flex items-center justify-center gap-2 rounded-full bg-brand py-3 font-semibold text-white"
                    >
                      <LogIn size={20} /> Log in
                    </Link>
                    <Link
                      href="/accounts/signup"
                      className="flex items-center justify-center gap-2 rounded-full border py-3 font-semibold dark:text-slate-200"
                    >
                      <User size={20} /> Sign up
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col pb-6 dark:text-slate-200">
                    {/* Profile header */}
                    <div
                      className="flex cursor-pointer items-center gap-3 px-6 pb-4 pt-2"
                      onClick={() => handleClick(userdata.username)}
                    >
                      <Avatar className="size-14">
                        <AvatarImage src={userdata.displayPicture} />
                        <AvatarFallback>
                          {userdata.firstname.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center">
                          <p className="truncate text-lg font-bold leading-tight">
                            {`${userdata.firstname} ${userdata.lastname}`.trim() || "John Doe"}
                          </p>
                          {userdata.verified ? <Statuser className="ml-1 size-4" /> : null}
                        </div>
                        <p className="truncate text-sm text-gray-500">
                          @{userdata.username || "johndoe"}
                        </p>
                      </div>
                    </div>
                    <div className="mx-6 border-t" />
                    {/* Menu items */}
                    <div id="more" className="flex flex-col py-2">
                      {[
                        { route: userdata.username, label: "Profile", Icon: User },
                        { route: "bookmarks", label: "Bookmarks", Icon: Bookmark },
                        { route: "general", label: "Settings", Icon: Settings2 },
                      ].map(({ route, label, Icon }) => (
                        <div
                          key={label}
                          data-route={route}
                          onClick={() => handleClick(route)}
                          className={`flex cursor-pointer items-center gap-5 px-6 py-3.5 text-xl active:bg-gray-100 dark:active:bg-zinc-800 ${activeRoute === route ? "font-bold" : "font-medium"}`}
                        >
                          <Icon size={26} strokeWidth={activeRoute === route ? 2.75 : 1.75} />
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="mx-6 border-t" />
                    {/* Account actions */}
                    <div className="flex flex-col py-2 text-base">
                      <Link
                        href={
                          pathname !== ""
                            ? "/accounts/login?backto=" + pathname
                            : "/accounts/login"
                        }
                        className="px-6 py-3 active:bg-gray-100 dark:active:bg-zinc-800"
                      >
                        Add an existing account
                      </Link>
                      <Link
                        href="/accounts/logout"
                        className="px-6 py-3 active:bg-gray-100 dark:active:bg-zinc-800"
                      >
                        Log out @{userdata.username || "johndoe"}
                      </Link>
                    </div>
                  </div>
                )}
              </DrawerContent>
            </Drawer>
          ) : (
            <div className="flex items-center justify-center">
              <div style={{ height: "40px", width: "40px" }} className="loader load" />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Root;
