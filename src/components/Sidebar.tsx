import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useTheme } from "@/app/providers/ThemeProvider";
import { useUser } from "@/app/providers/UserProvider";
import { UserData } from "@/lib/types/user";

import {
  SIDEBAR_ITEM_PITCH,
  SidebarItem,
  UserSection,
  adminSidebarItem,
  sidebarItems,
} from "./SidebarComps";
import { handleThemeChange1 } from "./ThemeToggle";

interface SidebarProps {
  activeRoute: string;
  setActiveRoute: (status: string) => void;
  setLoad: (status: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ setLoad, activeRoute, setActiveRoute }) => {
  const { userdata, loading, error, refetchUser } = useUser();
  const [isPopUp, setPopUp] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [isOpen, setOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const lastPointer = useRef<string>("mouse");
  const [isTapOpen, setTapOpen] = useState<boolean>(false);
  const [isMoreOpen, setMoreOpen] = useState<boolean>(false);
  const [fitCount, setFitCount] = useState<number>(Infinity);
  const isCollapsed = !(isHovered || isTapOpen || isPopUp || isMoreOpen);

  // Touch: first tap on the collapsed bar expands it (instead of navigating); tapping outside closes it.
  useEffect(() => {
    if (!isTapOpen) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setTapOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [isTapOpen]);

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
    if (pathname === "/") {
      router.push("/home");
    }
    setActiveRoute(pathname?.slice(1) || "");
  }, [router, pathname, setActiveRoute]);

  const handleClick = useCallback(
    (route: string) => {
      setLoad(true);
      setActiveRoute(route);
      setTapOpen(false);
    },
    [setLoad, setActiveRoute]
  );

  const handlePopUp = useCallback(() => {
    setPopUp(!isPopUp);
  }, [isPopUp]);

  const allItems = useMemo(
    () =>
      userdata.role === "admin"
        ? [...sidebarItems.slice(0, -1), adminSidebarItem]
        : sidebarItems.slice(0, -1),
    [userdata.role]
  );
  const moreItem = sidebarItems[sidebarItems.length - 1];

  // Work out how many items fit in the nav area; the rest move into the "More" popover.
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      // Measure the pitch from real nav links when two exist; otherwise use the known constant.
      // (The "More" row has a different box, so it must never be used for measuring.)
      const links = nav.querySelectorAll(":scope > a");
      let pitch = SIDEBAR_ITEM_PITCH;
      if (links.length >= 2) {
        const measured =
          links[1].getBoundingClientRect().top - links[0].getBoundingClientRect().top;
        if (measured > 0) pitch = measured;
      }
      setFitCount(Math.floor(nav.clientHeight / pitch));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [allItems.length]);

  const hasOverflow = allItems.length > fitCount;
  const visibleCount = hasOverflow ? Math.max(fitCount - 1, 0) : allItems.length;
  const visibleItems = allItems.slice(0, visibleCount);
  const overflowItems = allItems.slice(visibleCount);

  const userSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => {
      setIsDarkMode(theme === "dark");
    }, 100);
  }, [theme]);

  const darkMode = (isDark: boolean) => {
    setIsDarkMode(isDark);
    const newTheme = isDark ? "dark" : "light";
    handleThemeChange1(newTheme, isOpen, setTheme, setOpen);
  };

  return (
    <div
      id="sidebar"
      className={`${pathname?.includes("/accounts") ? "!hidden" : ""} relative hidden w-16 shrink-0 tablets:block`}
      ref={ref}
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setIsHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setIsHovered(false)}
      onClickCapture={(e) => {
        if (lastPointer.current !== "mouse" && isCollapsed) {
          e.preventDefault();
          e.stopPropagation();
          setTapOpen(true);
        }
      }}
    >
      {/* Floating panel: the outer element reserves 4rem in the layout, this one expands over the content. */}
      <div
        className={`absolute inset-y-0 left-0 flex flex-col overflow-hidden border-r bg-gray-50 transition-[width,box-shadow] duration-200 dark:bg-zinc-900 dark:text-slate-200 ${isCollapsed ? "w-16" : "w-64 rounded-r-2xl border-r-black/5 shadow-2xl dark:border-r-white/10"}`}
      >
        <div className="m-2 flex shrink-0 justify-start">
          <Image
            src="/velo11.png"
            className="displayPicture mb-[-5px] mt-[10px]"
            width={30}
            height={30}
            alt="logo"
          />
        </div>
        <div ref={navRef} className="min-h-0 flex-1 overflow-hidden whitespace-nowrap">
          {visibleItems.map((item) => (
            <SidebarItem
              key={item.route}
              item={item}
              activeRoute={activeRoute}
              handleClick={handleClick}
              userdata={userdata}
              isCollapsed={isCollapsed}
            />
          ))}
          {hasOverflow && (
            <SidebarItem
              item={moreItem}
              activeRoute={activeRoute}
              handleClick={handleClick}
              userdata={userdata}
              isCollapsed={isCollapsed}
              overflowItems={overflowItems}
              onMoreOpenChange={setMoreOpen}
            />
          )}
        </div>
        <div className="mx-2 shrink-0 border-t border-black/5 px-0 pb-1 pt-2 dark:border-white/10">
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
            isDarkMode={isDarkMode}
            onThemeChange={darkMode}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(Sidebar);
