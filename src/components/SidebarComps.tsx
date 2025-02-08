import React, { forwardRef } from 'react';
import Link from 'next/link';
import Image from "next/image";
import { BadgePlus, RefreshCw, Bell, Mail, User, LogIn, Ellipsis } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { UserData } from '@/redux/userSlice';
import { Statuser } from './VerificationComponent';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export const sidebarItems = [
  {
    route: 'home',
    icon: (
      <svg width='25px' height='25px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path className='hov dark:stroke-tom' d='M22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round'></path>
        <path className='hov dark:stroke-tom' d='M15 18H9' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round'></path>
      </svg>
    ),
    label: 'Home'
  },
  {
    route: 'explore',
    icon: (
      <svg width='25px' height='25px' className='dark:fill-tom' fill='#1C274C' viewBox='0 0 128 128' id='Layer_1' version='1.1' xmlSpace='preserve' xmlns='http://www.w3.org/2000/svg' xmlnsXlink='http://www.w3.org/1999/xlink' stroke='#000000' strokeWidth='0.00128'>
        <g id='SVGRepo_iconCarrier'> 
          <g> 
            <path className='hov dark:stroke-tom' d='M109,55c0-29.8-24.2-54-54-54C25.2,1,1,25.2,1,55s24.2,54,54,54c13.5,0,25.8-5,35.2-13.1l25.4,25.4l5.7-5.7L95.9,90.2 C104,80.8,109,68.5,109,55z M55,101C29.6,101,9,80.4,9,55S29.6,9,55,9s46,20.6,46,46S80.4,101,55,101z'></path> 
            <path className='hov dark:stroke-tom' d='M25.6,30.9l6.2,5.1C37.5,29,46,25,55,25v-8C43.6,17,32.9,22.1,25.6,30.9z'></path> 
            <path className='hov dark:stroke-tom' d='M17,55h8c0-2.1,0.2-4.1,0.6-6.1l-7.8-1.6C17.3,49.8,17,52.4,17,55z'></path> 
          </g> 
        </g>
      </svg>
    ),
    label: 'Explore'
  },
  {
    route: 'create-post',
    icon: (
      <BadgePlus size={25} strokeWidth={1.5}/>
    ),
    label: 'Post'
  },
  {
    route: 'chats',
    icon: (
      <Mail size={25}/>
    ),
    label: 'Chats'
  },
  // Add other sidebar items here...
  {
    route: 'profile',
    icon: (
      <svg width='25px' height='25px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path className='hov dark:stroke-tom' d='M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
        <path className='hov dark:stroke-tom' d='M20.5899 22C20.5899 18.13 16.7399 15 11.9999 15C7.25991 15 3.40991 18.13 3.40991 22' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
      </svg>
    ),
    label: 'Profile'
  },
  {
    route: 'general',
    icon: (
      <svg width='25px' height='25px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path className='hov dark:stroke-tom' d='M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z' stroke='#1C274C' strokeWidth='1.5' strokeMiterlimit='10' strokeLinecap='round' strokeLinejoin='round'/>
        <path className='hov dark:stroke-tom' d='M2 12.88V11.12C2 10.08 2.85 9.22 3.9 9.22C5.71 9.22 6.45 7.94 5.54 6.37C5.02 5.47 5.33 4.3 6.24 3.78L7.97 2.79C8.76 2.32 9.78 2.6 10.25 3.39L10.36 3.58C11.26 5.15 12.74 5.15 13.65 3.58L13.76 3.39C14.23 2.6 15.25 2.32 16.04 2.79L17.77 3.78C18.68 4.3 18.99 5.47 18.47 6.37C17.56 7.94 18.3 9.22 20.11 9.22C21.15 9.22 22.01 10.07 22.01 11.12V12.88C22.01 13.92 21.16 14.78 20.11 14.78C18.3 14.78 17.56 16.06 18.47 17.63C18.99 18.54 18.68 19.7 17.77 20.22L16.04 21.21C15.25 21.68 14.23 21.4 13.76 20.61L13.65 20.42C12.75 18.85 11.27 18.85 10.36 20.42L10.25 20.61C9.78 21.4 8.76 21.68 7.97 21.21L6.24 20.22C5.33 19.7 5.02 18.53 5.54 17.63C6.45 16.06 5.71 14.78 3.9 14.78C2.85 14.78 2 13.92 2 12.88Z' stroke='#1C274C' strokeWidth='1.5' strokeMiterlimit='10' strokeLinecap='round' strokeLinejoin='round'/>
      </svg>
    ),
    label: 'General'
  },
  {
    route: 'notifications',
    icon: (
      <Bell size={25}/>
    ),
    label: 'Notifications'
  },
  {
    route: 'feedback',
    icon: (
      <svg width='25px' height='25px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path className='hov dark:stroke-tom' d='M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
        <path className='hov dark:stroke-tom' d='M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
        <path className='hov dark:stroke-tom' d='M12 18.01L12.01 17.9989' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
      </svg>
    ),
    label: 'Feedback'
  }
];

export const SidebarItem: React.FC<{ 
  item: { 
    route: string;
    icon: React.ReactNode;
    label: string;
  }; 
  activeRoute: string; 
  handleClick: (route: string) => void; 
  userdata: UserData 
}> = ({ item, activeRoute, handleClick, userdata }) => {
  const isProfile = item.route === 'profile';
  const route = isProfile ? userdata.username : item.route;
  const label = isProfile ? (userdata.username ? userdata.username : 'Profile') : item.label;
  const isActive = activeRoute === route;

  return (
    <Link href={`/${route}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
          <div 
          className={`sidebar ft dark:text-slate-200 rout ${
            isActive ? 'active sticky top-0 bottom-0 backdrop-filter backdrop-blur-[5px]' : ''
          }`} 
          data-route={route}
          >
            <div 
              className='sidebar-icon' 
              onClick={() => handleClick(route)}
            >
              {item.icon}
              <div className='rt'>{label}</div>
            </div>
          </div>
          </TooltipTrigger>
          <TooltipContent side='right' align='center' className='900px:hidden' sideOffset={5} alignOffset={5}>
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Link>
  );
};

export const UserSection = forwardRef<HTMLDivElement, {
  error: any;
  loading: boolean;
  userdata: UserData;
  pathname: string;
  isPopUp: boolean;
  handlePopUp: () => void;
  refetchUser: () => void;
}>(({ error, loading, userdata, pathname, isPopUp, handlePopUp, refetchUser }, ref) => (
  <div ref={ref}>
    {!userdata._id ? (
      loading ? 
        <UserComponentLoading loading={loading} error={error} refetchUser={refetchUser}/> : 
        <div className='dark:text-slate-200 flex flex-col gap-4 px-1 py-2'>
          <p className='flex items-center hover:text-brand'>
            <LogIn size={25} className="mr-2" />
            <Link href={`${pathname !== '' ? '/accounts/login?backto='+pathname : '/accounts/login'}`} className='hidden 900px:!flex'>Log in</Link>
          </p>
          <p className='flex items-center hover:text-brand'>
            <User size={25} className="mr-2" />
            <Link href='/accounts/signup' className='hidden 900px:!flex'>Sign up</Link>
          </p>
        </div>
    ) : (
      <Popover open={isPopUp} onOpenChange={handlePopUp}>
        <PopoverTrigger>
          <div className="w-full cursor-pointer">
            <UserComponent userdata={userdata}/>
          </div>
        </PopoverTrigger>
        <PopoverContent className="bg-white dark:bg-neutral-950 dark:text-slate-200 w-auto p-2 rounded-md shadow-lg">
          <div className="flex flex-col">
            <Link href="/accounts/logout" className="hover:bg-slate-200 dark:hover:bg-slate-900 p-2 rounded">
              Log out <b className="username">@{userdata.username !== '' ? userdata.username : 'johndoe'}</b>
            </Link>
            <Link href="/accounts/login" className="hover:bg-slate-200 dark:hover:bg-slate-900 p-2 rounded">
              Add another account?
            </Link>
          </div>
        </PopoverContent>
      </Popover>
    )}
  </div>
));

UserSection.displayName = 'UserSection';

const UserComponentLoading = ({loading, error, refetchUser}: {loading: boolean, error: boolean, refetchUser: () => void}) => {
  return (
    <div className='user 900px:items-center hover:bg-slate-200 dark:hover:bg-neutral-900 !justify-center 900px:!justify-between !my-[.5em] !mx-0 !px-2 !py-1 900px:shadow-bar 900px:dark:shadow-bar-dark w-full'>
        <div className='img'>
        {loading ? (
            <div className={`flex items-center justify-center w-full h-[90%]`}><div className='loader show h-6 w-6'/></div>
        ) : error && (
            <RefreshCw className='cursor-pointer' size={25} onClick={refetchUser}/> 
        )}
        </div>
        
        <div className='flex-1 items-center max-w-[50%] names flex-col hidden 900px:!flex'>
            <div className='flex max-w-full dark:text-slate-200'>
                <div className='animate-pulse w-14 h-4 bg-[#9E9E9E] rounded mb-1'/>
            </div>

            <div className='animate-pulse w-14 h-4 bg-[#9E9E9E] rounded'/>
        </div>

        <Ellipsis size={25} className="cursor-pointer hidden 900px:!block dark:text-gray-400" />
    </div>
  )
}

const UserComponent = ({userdata}: {userdata: UserData}) => {
  return (
    <div className='user 900px:items-center hover:bg-slate-200 dark:hover:bg-neutral-900 !justify-center 900px:!justify-between !my-[.5em] !mx-0 !px-2 !py-1 900px:shadow-bar 900px:dark:shadow-bar-dark w-full'>
      <div className='img'>
        <Image 
          src={userdata.dp ? 'https://s3.amazonaws.com/profile-display-images/'+userdata.dp : '/default.jpeg'} 
          className='displayPicture dark:border-slate-200 size-10 900px:size-auto' 
          width={30} 
          height={30} 
          alt='Display Picture'
        />
      </div>
      
      <div className='flex-1 items-center max-w-[50%] names flex-col hidden 900px:!flex'>
        <div className='flex max-w-full dark:text-slate-200'>
          <p className='truncate'>{userdata.name}</p>
          {userdata.verified && <Statuser className='size-4' />}
        </div>
        <p className='username text-sm'>@{userdata.username}</p>
      </div>

      <Ellipsis size={25} className="cursor-pointer hidden 900px:!block dark:text-gray-400" />
    </div>
  );
};