/* eslint-disable tailwindcss/no-custom-classname */
import { Moon, Sun, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";

import { useTheme } from "@/app/providers/ThemeProvider";
import { useUser } from "@/app/providers/UserProvider";
import { UserData } from "@/lib/types/user";

import { SidebarItem, UserSection, sidebarItems } from "./SidebarComps";
import { handleThemeChange1 } from "./ThemeToggle";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface SidebarProps {
  activeRoute: string;
  setActiveRoute: (status: string) => void;
  setLoad: (status: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  setLoad,
  activeRoute,
  setActiveRoute,
}) => {
  const { userdata, loading, error, refetchUser } = useUser();
  const [isPopUp, setPopUp] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [isOpen, setOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setPopUp(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const isSidebarCollapsed = localStorage.getItem("isSidebarCollapsed");
    if (isSidebarCollapsed) {
      setIsCollapsed(isSidebarCollapsed === "true");
    }
  }, []);

  useEffect(() => {
    if (pathname?.includes("/chats")) {
      setIsCollapsed(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/") {
      router.push("/home");
    }
    setActiveRoute(pathname?.slice(1) || "");
  }, [router, pathname, setActiveRoute]);

  const handleClick = useCallback(
    (route: string) => {
      setLoad(true);
      setActiveRoute(route);
    },
    [setLoad, setActiveRoute]
  );

  const handlePopUp = useCallback(() => {
    setPopUp(!isPopUp);
  }, [isPopUp]);

  const memoizedSidebarItems = useMemo(
    () =>
      sidebarItems.map((item, key) => (
        <TooltipProvider key={item.route + key}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarItem
                item={item}
                activeRoute={activeRoute}
                handleClick={handleClick}
                userdata={userdata}
                isCollapsed={isCollapsed}
              />
            </TooltipTrigger>
            <TooltipContent
              side="right"
              align="center"
              className="md:hidden"
              sideOffset={5}
              alignOffset={5}
            >
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )),
    [activeRoute, handleClick, userdata, isCollapsed]
  );

  const userSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDarkMode(theme === "dark");
  }, [theme]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    const newTheme = isDarkMode ? "light" : "dark";
    handleThemeChange1(newTheme, isOpen, setTheme, setOpen);
  };

  const darkMode = (isDark: boolean) => {
    setIsDarkMode(isDark);
    const newTheme = isDark ? "dark" : "light";
    handleThemeChange1(newTheme, isOpen, setTheme, setOpen);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    localStorage.setItem("isSidebarCollapsed", (!isCollapsed).toString());
  };

  return (
    <div
      id="sidebar"
      className={`${pathname?.includes("/accounts") ? "!hidden" : ""} tablets:flex relative hidden max-w-min flex-col overflow-auto transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"}`}
    >
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 z-10 rounded-full bg-white p-1 shadow-md transition-colors hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
      <div className="m-2 flex justify-center md:justify-start">
        <Image
          src="/velo11.png"
          className="displayPicture mb-[-5px] mt-[10px]"
          width={30}
          height={30}
          alt="logo"
        />
      </div>
      <div className="flex-1">{memoizedSidebarItems}</div>
      <div className="flex justify-center px-2 md:block">
        <div
          className={`${isCollapsed ? "hidden" : "shadow-bar dark:shadow-bar-dark hidden items-center justify-between rounded-full bg-gray-100 p-1 md:flex dark:bg-zinc-900 dark:text-gray-200"}`}
        >
          <button
            onClick={() => darkMode(false)}
            className={`flex flex-1 items-center gap-1 rounded-full px-4 py-2 ${!isDarkMode ? "shadow-bar dark:shadow-bar-dark bg-white dark:bg-zinc-600" : ""}`}
          >
            <Sun size={20} className="inline" /> Light
          </button>
          <button
            onClick={() => darkMode(true)}
            className={`flex flex-1 items-center gap-1 rounded-full px-4 py-2 ${isDarkMode ? "shadow-bar dark:shadow-bar-dark bg-white dark:bg-zinc-600" : ""}`}
          >
            <Moon size={20} className="inline" /> Dark
          </button>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleDarkMode}
                className={`${isCollapsed ? "mx-auto !block" : ""} shadow-bar dark:shadow-bar-dark rounded-full bg-gray-100 p-2 md:hidden dark:bg-gray-700`}
              >
                {isDarkMode ? (
                  <Moon size={20} className="mx-auto" />
                ) : (
                  <Sun size={20} className="mx-auto" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              align="center"
              className="md:hidden"
              sideOffset={5}
              alignOffset={5}
            >
              Toggle {!isDarkMode ? "Dark" : "Light"} Mode
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="px-2">
        <UserSection
          ref={userSectionRef}
          error={error}
          loading={loading}
          userdata={userdata as UserData}
          pathname={pathname as string}
          isPopUp={isPopUp}
          isCollapsed={isCollapsed}
          handlePopUp={handlePopUp}
          refetchUser={refetchUser}
        />
      </div>
    </div>
  );
};

export default React.memo(Sidebar);
