import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Image from 'next/image';
import { useUser } from '@/app/providers/UserProvider';
import { SidebarItem, UserSection, sidebarItems } from './SidebarComps';
import { UserData } from '@/redux/userSlice';
import { Moon, Sun, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import { handleThemeChange1 } from './ThemeToggle';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface SidebarProps {
  activeRoute: string;
  isMoreShown: boolean;
  setActiveRoute: (status: string) => void;
  setLoad: (status: boolean) => void;
  setMoreStatus: (status: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ setLoad, activeRoute, isMoreShown, setActiveRoute, setMoreStatus }) => {
  const params = useParams<{ chat: string }>();
  const { userdata, loading, error, refetchUser } = useUser();
  const [isPopUp, setPopUp] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme()
  const [isOpen,setOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const routes = ['accounts/login', 'accounts/signup', 'accounts/signup/1', 'accounts/signup/2', 'accounts/forgot-password', 'accounts/reset-password', 'accounts/logout'];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setPopUp(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const isSidebarCollapsed = localStorage.getItem('isSidebarCollapsed');
    if (isSidebarCollapsed) {
      setIsCollapsed(isSidebarCollapsed === 'true');
    }
  }, []);

  useEffect(() => {
    if (pathname?.includes('/chats')) {
      setIsCollapsed(true);
    }
  }, [pathname]);

  useEffect(() => {
    pathname === '/' ? router.push('/home') : null;
    setActiveRoute(pathname?.slice(1) || '');
  }, [router, pathname, setActiveRoute]);

  const handleClick = useCallback((route: string) => {
    setLoad(true);
    setActiveRoute(route);
  }, [setLoad, setActiveRoute]);

  const handlePopUp = useCallback(() => {
    setPopUp(!isPopUp);
  }, [isPopUp]);

  const memoizedSidebarItems = useMemo(() => sidebarItems.map((item, key) => (
    <TooltipProvider key={item.route+key}>
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
        <TooltipContent side='right' align='center' className='md:hidden' sideOffset={5} alignOffset={5}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )), [activeRoute, handleClick, userdata, isCollapsed]);
  
  const userSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsDarkMode(theme === 'dark');
  }, [theme]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    const newTheme = isDarkMode ? 'light' : 'dark';
    handleThemeChange1(newTheme, isOpen, setTheme, setOpen);
  };

  const darkMode = (isDark: boolean) => {
    setIsDarkMode(isDark);
    const newTheme = isDark ? 'dark' : 'light';
    handleThemeChange1(newTheme, isOpen, setTheme, setOpen);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    localStorage.setItem('isSidebarCollapsed', (!isCollapsed).toString());
  };

  return (
    <div id='sidebar' className={`${pathname?.includes("/accounts") ? '!hidden' : ''} hidden tablets:flex flex-col overflow-auto max-w-min relative transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-white dark:bg-zinc-800 p-1 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors z-10"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
      <div className='flex md:justify-start justify-center m-2'>
        <Image src='/velo11.png' className='displayPicture mt-[10px] mb-[-5px]' width={30} height={30} alt='logo'/>
      </div>
      <div className='flex-1'>
        {memoizedSidebarItems}
      </div>
      <div className="px-2 flex justify-center md:block">
        <div className={`${isCollapsed ? 'hidden' : "md:flex hidden justify-between items-center bg-gray-100 dark:bg-zinc-900 dark:text-gray-200 p-1 rounded-full shadow-bar dark:shadow-bar-dark"}`}>
          <button
            onClick={() => darkMode(false)}
            className={`flex gap-1 items-center flex-1 py-2 px-4 rounded-full ${!isDarkMode ? 'bg-white dark:bg-zinc-600 shadow-bar dark:shadow-bar-dark' : ''}`}
          >
            <Sun size={20} className="inline" /> Light
          </button>
          <button
            onClick={() => darkMode(true)}
            className={`flex gap-1 items-center flex-1 py-2 px-4 rounded-full ${isDarkMode ? 'bg-white dark:bg-zinc-600 shadow-bar dark:shadow-bar-dark' : ''}`}
          >
            <Moon size={20} className="inline" /> Dark
          </button>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={toggleDarkMode} className={`${isCollapsed ? "!block mx-auto" : ""} md:hidden p-2 bg-gray-100 dark:bg-gray-700 rounded-full shadow-bar dark:shadow-bar-dark`}>
                {isDarkMode ? <Moon size={20} className="mx-auto" /> : <Sun size={20} className="mx-auto" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side='right' align='center' className='md:hidden' sideOffset={5} alignOffset={5}>Toggle {!isDarkMode ? 'Dark' : 'Light'} Mode</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className='px-2'>
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
}

export default React.memo(Sidebar);