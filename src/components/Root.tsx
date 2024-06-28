"use client";
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Home from './Home1';

interface RootProps {
  activeRoute: string;
  setActiveRoute: (status: string) => void;
  setMoreStatus: (status: boolean) => void;
}

const Root: React.FC<RootProps> = ({ activeRoute, setActiveRoute, setMoreStatus }) => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof setActiveRoute === 'function' && typeof setMoreStatus === 'function') {
      pathname === '/' ? router.push('/home') : null;
      const route = pathname ? pathname.slice(1) || '' : ''; 
      setActiveRoute(route);
    }
  }, [router, setActiveRoute, setMoreStatus, pathname]);


  const handleClickMore = (command: string) => {
    if (typeof setMoreStatus === 'function') {
      command === 'close' ? setMoreStatus(false) : setMoreStatus(true);
    }
  };

    return (
      <>
        <div id="pre-home" className={activeRoute === 'home' || activeRoute === '' ? '' : 'h-hide'}  onClick={() => handleClickMore('close')}>
          <Home />
        </div>
      </>
    );
}

export default Root;