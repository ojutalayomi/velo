"use client";
import React, { useEffect, useRef,useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from "next/image";
import { useSelector } from 'react-redux';
import { useUser } from '@/hooks/useUser';
import { ChevronRight, Bell, Lock, User, Moon, HelpCircle, LogIn, LogOut, BadgePlus, Mail, Settings, Palette, MessageSquarePlus, Home, Search } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
interface BottombarProps {
  activeRoute: string;
  isMoreShown: boolean;
  setActiveRoute: (status: string) => void;
  setLoad: (status: boolean) => void;
  setMoreStatus: (status: boolean) => void;
}

const Root: React.FC<BottombarProps> = ({ setLoad, activeRoute, isMoreShown, setActiveRoute, setMoreStatus }) => {
  const { userdata, loading, error, refetchUser } = useUser();
  const [isPopUp,setPopUp] = useState<boolean>(false);
  const [open,setOpen] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const ref1 = useRef<HTMLDivElement>(null);
  const routes = ['accounts/login','accounts/signup','accounts/forgot-password','accounts/reset-password'];


  
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setPopUp(false);
      }
      if (ref1.current && !ref1.current.contains(event.target as Node)) {
        setMoreStatus(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [setMoreStatus]);

  useEffect(() => {
    // console.log(location)
    pathname === '/' ? router.push('/home') : null;
    // setPreviousLocation(location.pathname);
    setActiveRoute(pathname?.slice(1) || '');
  }, [pathname,setActiveRoute,router]);

  const handleClick = (route: string) => {
    setLoad(true);
    setOpen(false);
    router.push('/'+route);
    setActiveRoute(route);
    setMoreStatus(false);
  };

  const handlePopUp = () => {
    setPopUp(!isPopUp);
  };

  const handleClickMore = (command: string) => {
    command === 'close' ? setMoreStatus(false) : setMoreStatus(true);
  };

    return (
      <>
        <div className={`bg-slate-200 fixed bottom-0 left-0 right-0 tablets:hidden z-50 shadow-md rounded-t-md dark:bg-zinc-900 ${routes.includes(activeRoute) && 'hidden'}`}>

          <div className='!shadow-none py-[10px] flex justify-evenly w-full'>
            <div onClick={() => handleClick('home')} className={`flex flex-col items-center justify-center dark:text-slate-200 ${activeRoute === 'home' ? 'active' : ''}`}>
              <Home size={22} className="dark:stroke-tom" />
              {/* <div>Home</div> */}
            </div>
            <div onClick={() => handleClick('explore')} className={`flex flex-col items-center justify-center dark:text-slate-200 ${activeRoute === 'explore' ? 'active' : ''}`}>
              <Search size={22} className="dark:stroke-tom" />
              {/* <div>Explore</div> */}
            </div>
            <div onClick={() => handleClick('create-post')} className={`flex flex-col items-center justify-center dark:text-slate-200 ${activeRoute === 'create-post' ? 'active' : ''}`}>
              <BadgePlus size={22} className="dark:stroke-tom" />
              {/* <div>Post</div> */}
            </div>
            <div onClick={() => handleClick('chats')} className={`flex flex-col items-center justify-center dark:text-slate-200 ${activeRoute === 'chats' ? 'active' : ''}`}>
              <Mail size={22} className="dark:stroke-tom" />
              {/* <div>Chats</div> */}
            </div>
            {(userdata._id) ? (
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerTrigger>
                <Avatar>
                  <AvatarImage src={'https://s3.amazonaws.com/profile-display-images/'+userdata.dp} />
                  <AvatarFallback>V</AvatarFallback>
                </Avatar>
              </DrawerTrigger>
              <DrawerContent className='tablets1:hidden'>
                <div id='more' className={`flex flex-col gap-2 left-0 px-4 font-light leading-normal`}>
                  <div className={`flex gap-2 items-center justify-start dark:text-slate-200 rout ${activeRoute === 'general' ? 'active' : ''}`} data-route='general' onClick={() => handleClick('general')}>
                    <Settings size={25}/>
                    <div className='text-lg'>General</div>
                  </div>
                  <div className={`flex gap-2 items-center justify-start dark:text-slate-200 rout ${activeRoute === 'notifications' ? 'active' : ''}`} data-route='notifications' onClick={() => handleClick('notifications')}>
                    <Bell size={25}/>
                    <div className='notifications rt'>Notifications</div>
                  </div>
                  <div className={`flex gap-2 items-center justify-start dark:text-slate-200 rout ${activeRoute === userdata.username ? 'active' : ''}`} data-route={userdata.username} onClick={() => handleClick(userdata.username)}>
                    <User size={25}/>
                    <div className='myprofile rt'>@{userdata.username + "'s"} Profile</div>
                  </div>
                  <div className={`flex gap-2 items-center justify-start dark:text-slate-200 rout ${activeRoute === 'user-interface' ? 'active' : ''}`} data-route='user-interface' onClick={() => handleClick('user-interface')}>
                    <Palette size={25}/>
                    <div className='user-interface rt'>User Interface</div>
                  </div>
                  <div className={`flex gap-2 items-center justify-start dark:text-slate-200 rout ${activeRoute === 'feedback' ? 'active' : ''}`} data-route='feedback' onClick={() => handleClick('feedback')}>
                    <MessageSquarePlus size={25}/>
                    <div className='feedback rt'>Feedback</div>
                  </div>
                </div>
                <DrawerFooter>
                  {!userdata._id ?
                  <div className='dark:text-slate-200 flex items-center justify-between'>
                    <p className='flex items-center'>
                      <LogIn size={25} className="mr-2" />
                      <Link href='/accounts/login'>Log in</Link>
                    </p>
                    <p className='flex items-center'>
                      <User size={25} className="mr-2" />
                      <Link href='/accounts/signup'>Sign up</Link>
                    </p>
                  </div> 
                  :
                  <div className='user'>
                    <div className='img'>
                      {/* https://s3.amazonaws.com/profile-display-images/ */}
                      {!loading 
                      ? 
                      <Avatar>
                        <AvatarImage src={'https://s3.amazonaws.com/profile-display-images/'+userdata.dp} />
                        <AvatarFallback>{userdata.firstname.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      : 
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '90%'}}><div style={{height: '30px', width: '30px'}} className='loader load'></div></div>}
                    </div>
                    <div className='names flex flex-col items-center'>
                      <div className='flex dark:text-slate-200'>
                        <p>{userdata.firstname !== '' ? userdata.firstname : 'John Doe'}</p>
                        {userdata.verified ? <Image src='/verified.svg' className='verified border-0' width={20} height={20} alt='Verified tag'/> : null}
                      </div>
                      <p className='username text-xs'>@{userdata.username !== '' ? userdata.username : 'johndoe'}</p>
                    </div>
                    <Popover>
                      <PopoverTrigger>
                        <svg height='25px' width='25px' viewBox='0 0 24 24' aria-hidden='true' className='three-dots'>
                          <g><path className='pathEllip dark:fill-tom' d='M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z'></path></g>
                        </svg>
                      </PopoverTrigger>
                      <PopoverContent className='m-2 w-auto'>
                        <p className='hover:bg-slate-200'>
                          <Link href='/accounts/logout'>Log out <b className='username'>@{userdata.username !== '' ? userdata.username : 'johndoe'}</b></Link>
                        </p>
                        <p className='hover:bg-slate-200'>
                          <Link href={`${pathname !== '' ? '/accounts/login?backto='+pathname : '/accounts/login'}`}>Add another account?</Link>
                        </p>
                      </PopoverContent>
                    </Popover>
                  </div>
                  }
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            )
            : 
            <div className='flex items-center justify-center'><div style={{height: '22px', width: '22px'}} className='loader load'></div></div>}
          </div>
        </div>
      </>
    );
}

export default Root;