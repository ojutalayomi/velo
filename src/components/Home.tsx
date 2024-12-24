"use client";
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { setActiveRoute, setMoreStatus } from '../redux/navigationSlice';
import { useUser } from '@/hooks/useUser';
import Home from './Home1';

// interface RootProps {
//   activeRoute: string;
//   setActiveRoute: (status: string) => void;
//   setMoreStatus: (status: boolean) => void;
// }

const Root: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof setActiveRoute === 'function' && typeof setMoreStatus === 'function') {
      pathname === '/' ? router.push('/home') : null;
      const route = pathname ? pathname.slice(1) || '' : ''; 
      setActiveRoute(route);
    }
  }, [router, pathname]);


  const handleClickMore = (command: string) => {
    if (typeof setMoreStatus === 'function') {
      command === 'close' ? setMoreStatus(false) : setMoreStatus(true);
    }
  };

    return (
      <>
        <div className="tablets:w-3/5 overflow-hidden w-full"  onClick={() => handleClickMore('close')}>
          <Home />
        </div>
      </>
    );
}

export default Root;