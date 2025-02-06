import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';
import { SidebarItem, UserSection, sidebarItems } from './SidebarComps';
import { UserData } from '@/redux/userSlice';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/providers';
import { handleThemeChange1 } from './ThemeToggle';

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

  const memoizedSidebarItems = useMemo(() => sidebarItems.map((item) => (
    <SidebarItem
      key={item.route}
      item={item}
      activeRoute={activeRoute}
      handleClick={handleClick}
      userdata={userdata}
    />
  )), [activeRoute, handleClick, userdata]);
  
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

  return (
    <div id='sidebar' className={`${routes.includes(activeRoute) && '!hidden'} hidden tablets:flex flex-col`}>
      {/* <h1 className="brandname dark:text-slate-200 dark:after:text-slate-200 text-lg after:content-['V']"></h1> */}
      <div className='flex p-[.8em]'>
        <Image src='/velo11.png' className='displayPicture mt-[10px] mb-[-5px]' width={30} height={30} alt='logo'/>
      </div>
      <div className='flex-1 overflow-auto'>
        {memoizedSidebarItems}
      </div>
      <div className="px-2 flex justify-center 900px:block">
        <div className="900px:flex hidden justify-between items-center bg-gray-100 dark:bg-zinc-900 dark:text-gray-200 p-1 rounded-full shadow-bar dark:shadow-bar-dark">
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
        <button onClick={toggleDarkMode} className="900px:hidden p-2 bg-gray-100 dark:bg-gray-700 rounded-full shadow-bar dark:shadow-bar-dark">
          {isDarkMode ? <Moon size={20} className="mx-auto" /> : <Sun size={20} className="mx-auto" />}
        </button>
      </div>
      <div className='px-2'>
        <UserSection
          ref={userSectionRef}
          error={error}
          loading={loading}
          userdata={userdata as UserData}
          pathname={pathname as string}
          isPopUp={isPopUp}
          handlePopUp={handlePopUp}
          refetchUser={refetchUser}
        />
      </div>
    </div>
  );
}

export default React.memo(Sidebar);