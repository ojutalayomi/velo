import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { SidebarItem, UserSection, sidebarItems } from './SidebarComps';
import { UserData } from '@/redux/userSlice';

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
    router.push(`/${route}`);
    setActiveRoute(route);
  }, [setLoad, router, setActiveRoute]);

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

  return (
    <div id='sidebar' className={`${routes.includes(activeRoute) && '!hidden'} hidden tablets:flex flex-col`}>
      <h1 className="brandname dark:text-slate-200 dark:after:text-slate-200 text-lg after:content-['V']"></h1>
      <div className='flex-1 overflow-auto'>
        {memoizedSidebarItems}
      </div>
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
  );
}

export default React.memo(Sidebar);