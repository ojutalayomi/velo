"use client";
import {
  Bell,
  User,
  LogIn,
  BadgePlus,
  Mail,
  Settings,
  Home,
  Search,
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
    "explore",
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
      <div
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-xl bg-slate-200 shadow-md tablets:hidden dark:bg-zinc-900 ${(routes.includes(activeRoute) || pathname?.includes("/accounts")) && "hidden"}`}
      >
        {/* Brand accent strip */}
        <div className="h-0.5 w-full bg-gradient-to-r from-brand/40 via-brand to-brand/40" />
        <div className="flex w-full justify-evenly py-[10px] !shadow-none">
          <div
            onClick={() => handleClick("home")}
            className={`flex flex-col items-center justify-center dark:text-slate-200 ${activeRoute === "home" ? "active" : ""}`}
          >
            <Home size={22} className="dark:stroke-tom" />
            {/* <div>Home</div> */}
          </div>
          <div
            onClick={() => handleClick("explore")}
            className={`flex flex-col items-center justify-center dark:text-slate-200 ${activeRoute === "explore" ? "active" : ""}`}
          >
            <Search size={22} className="dark:stroke-tom" />
            {/* <div>Explore</div> */}
          </div>
          <div
            onClick={() => handleClick("compose/post")}
            className={`flex flex-col items-center justify-center dark:text-slate-200 ${activeRoute === "create-post" ? "active" : ""}`}
          >
            <BadgePlus size={22} className="dark:stroke-tom" />
            {/* <div>Post</div> */}
          </div>
          <div
            onClick={() => handleClick("chats")}
            className={`flex flex-col items-center justify-center dark:text-slate-200 ${activeRoute === "chats" ? "active" : ""} relative`}
          >
            <Mail size={22} className="dark:stroke-tom" />
            {i > 0 && (
              <div className="absolute right-0 flex size-5 translate-x-1/2 translate-y-[-50%] transform items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                {i}
              </div>
            )}
            {/* <div>Chats</div> */}
          </div>
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
                <DrawerHeader>
                  <DrawerTitle>Velo Menu</DrawerTitle>
                  <DrawerDescription>Explore your profile and settings</DrawerDescription>
                </DrawerHeader>
                <div
                  id="more"
                  className={`left-0 flex flex-col gap-2 px-4 font-light leading-normal`}
                >
                  <div
                    className={`rout flex items-center justify-start gap-2 dark:text-slate-200 ${activeRoute === "general" ? "active" : ""}`}
                    data-route="general"
                    onClick={() => handleClick("general")}
                  >
                    <Settings size={25} />
                    <div className="text-lg">General</div>
                  </div>
                  <div
                    className={`rout flex items-center justify-start gap-2 dark:text-slate-200 ${activeRoute === "notifications" ? "active" : ""}`}
                    data-route="notifications"
                    onClick={() => handleClick("notifications")}
                  >
                    <Bell size={25} />
                    <div className="notifications rt">Notifications</div>
                    {notificationUnread > 0 && (
                      <div className="ml-auto flex size-5 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                        {notificationUnread > 99 ? "99+" : notificationUnread}
                      </div>
                    )}
                  </div>
                  {userdata.username && (
                    <div
                      className={`rout flex items-center justify-start gap-2 dark:text-slate-200 ${activeRoute === userdata.username ? "active" : ""}`}
                      data-route={userdata.username}
                      onClick={() => handleClick(userdata.username)}
                    >
                      <User size={25} />
                      <div className="myprofile rt">@{userdata.username}</div>
                    </div>
                  )}
                  <div
                    className={`rout flex items-center justify-start gap-2 dark:text-slate-200 ${activeRoute === "feedback" ? "active" : ""}`}
                    data-route="bookmarks"
                    onClick={() => handleClick("bookmarks")}
                  >
                    <Bookmark size={25} />
                    <div className="bookmarks rt">Bookmarks</div>
                  </div>
                </div>
                <DrawerFooter>
                  {!userdata._id ? (
                    <div className="flex items-center justify-between dark:text-slate-200">
                      <p className="flex items-center">
                        <LogIn size={25} className="mr-2" />
                        <Link href="/accounts/login">Log in</Link>
                      </p>
                      <p className="flex items-center">
                        <User size={25} className="mr-2" />
                        <Link href="/accounts/signup">Sign up</Link>
                      </p>
                    </div>
                  ) : (
                    <div className="user">
                      <div className="img">
                        {/* https://s3.amazonaws.com/profile-display-images/ */}
                        {!loading ? (
                          <Avatar>
                            <AvatarImage src={userdata.displayPicture} />
                            <AvatarFallback>
                              {userdata.firstname.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              height: "90%",
                            }}
                          >
                            <div
                              style={{ height: "30px", width: "30px" }}
                              className="loader load"
                             />
                          </div>
                        )}
                      </div>
                      <div className="names flex flex-col items-center">
                        <div className="flex dark:text-slate-200">
                          <p>
                            {userdata.firstname !== ""
                              ? userdata.firstname + " " + userdata.lastname
                              : "John Doe"}
                          </p>
                          {userdata.verified ? <Statuser className="ml-1 size-4" /> : null}
                        </div>
                        <p className="username text-xs">
                          @{userdata.username !== "" ? userdata.username : "johndoe"}
                        </p>
                      </div>
                      <Popover>
                        <PopoverTrigger>
                          <svg
                            height="25px"
                            width="25px"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className="three-dots"
                          >
                            <g>
                              <path
                                className="pathEllip dark:fill-tom"
                                d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"
                               />
                            </g>
                          </svg>
                        </PopoverTrigger>
                        <PopoverContent className="m-2 w-auto">
                          <p className="hover:bg-slate-200">
                            <Link href="/accounts/logout">
                              Log out{" "}
                              <b className="username">
                                @{userdata.username !== "" ? userdata.username : "johndoe"}
                              </b>
                            </Link>
                          </p>
                          <p className="hover:bg-slate-200">
                            <Link
                              href={`${pathname !== "" ? "/accounts/login?backto=" + pathname : "/accounts/login"}`}
                            >
                              Add another account?
                            </Link>
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </DrawerFooter>
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
