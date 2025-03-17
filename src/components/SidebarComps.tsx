import React, { ComponentPropsWithoutRef, forwardRef } from 'react';
import Link from 'next/link';
import Image from "next/image";
import { BadgePlus, RefreshCw, Bell, Mail, User, LogIn, Ellipsis, CircleEllipsis, Settings, CircleHelp, Home, Search, User2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { UserData } from '@/redux/userSlice';
import { Statuser } from './VerificationComponent';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { cn } from '@/lib/utils';

export const sidebarItems = [
  {
    route: 'home',
    icon: Home,
    label: 'Home'
  },
  {
    route: 'explore',
    icon: Search,
    label: 'Explore'
  },
  {
    route: 'create-post',
    icon: BadgePlus,
    label: 'Post'
  },
  {
    route: 'chats',
    icon: Mail,
    label: 'Chats'
  },
  // Add other sidebar items here...
  {
    route: 'profile',
    icon: User2,
    label: 'Profile'
  },
  {
    route: 'general',
    icon: Settings,
    label: 'General'
  },
  {
    route: 'notifications',
    icon: Bell,
    label: 'Notifications'
  },
  {
    route: 'feedback',
    icon: CircleHelp,
    label: 'Feedback'
  },
  {
    route: '#',
    icon: CircleEllipsis,
    label: 'Others'
  }
];

export const SidebarItem = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">  &{ 
  item: typeof sidebarItems[0]; 
  activeRoute: string; 
  handleClick: (route: string) => void; 
  userdata: UserData;
}>( ({ item, activeRoute, handleClick, userdata, ...props }, ref) => {
  const { conversations } = useSelector((state: RootState) => state.chat)
  let i = 0;
  conversations?.map(convo => {
    i = i + convo.unread
  })
  const isProfile = item.route === 'profile';
  const route = isProfile ? userdata.username : item.route;
  const label = isProfile ? (userdata.username ? userdata.username : 'Profile') : item.label;
  const isActive = activeRoute === route;

  if(item.label === 'Others') return (
    <Popover>
      <PopoverTrigger asChild>
        <div
        id={item.label.toLowerCase()}
        ref={ref} 
        className={`sidebar ft dark:text-slate-200 rout`} 
        data-route={route}
        {...props}
        >
          <div 
            className='sidebar-icon relative' 
            onClick={() => handleClick(route)}
          >
            <item.icon />
            <div className='rt'>{label}</div>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent side='right' aria-label='morePopOver' className="flex flex-col gap-4 bg-white dark:bg-neutral-950 dark:text-slate-200 w-auto p-4 rounded-md shadow-lg">
        {sidebarItems.slice(3, 8).map((item, key) => (
          <Link key={item.route+key+'l'} aria-label={item.route} className='hidden' href={`/${item.route}`}>
            <div
              className='flex items-center gap-2 relative group' 
              onClick={() => handleClick(route)}
            >
              <item.icon size={25} className='group-hover:text-brand'/>
              <div className='group-hover:text-brand'>{item.label}</div>
              {(item.label === 'Chats' && i > 0) && <div className='bg-brand text-white text-xs absolute right-0 transform translate-y-[-50%] 900px:translate-y-0 900px:relative font-bold rounded-full w-5 h-5 flex items-center justify-center'>{i}</div>}
            </div>
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  )

  return (
    <Link href={`/${route}`}>
      <div
      ref={ref}
      {...props} 
      className={cn(`sidebar ft dark:text-slate-200 rout ${
        isActive ? 'active backdrop-filter backdrop-blur-[5px]' : ''
      }`, props.className)} 
      data-route={route}
      aria-label={item.route}
      >
        <div 
          className='sidebar-icon relative' 
          onClick={() => handleClick(route)}
        >
          <item.icon size={25} />
          <div className='rt'>{label}</div>
          {(item.label === 'Chats' && i > 0) && <div className='bg-brand text-white text-xs absolute right-0 transform translate-y-[-50%] 900px:translate-y-0 900px:relative font-bold rounded-full w-5 h-5 flex items-center justify-center'>{i}</div>}
        </div>
      </div>
    </Link>
  );
})

SidebarItem.displayName = 'SidebarItem';

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
      loading 
        ? 
        <UserComponentLoading loading={loading} error={error} refetchUser={refetchUser}/> 
        : 
        <div className='dark:text-slate-200 flex flex-col gap-4 px-1 py-2'>
          <Link href={`${pathname !== '' ? '/accounts/login?backto='+pathname : '/accounts/login'}`} className='flex items-center hover:text-brand'>
            <LogIn size={25} className="mr-2" />
            <p className='hidden 900px:!flex'>Log in</p>
          </Link>
          <Link href='/accounts/signup' className='flex items-center hover:text-brand'>
            <User size={25} className="mr-2" />
            <p className='hidden 900px:!flex'>Sign up</p>
          </Link>
        </div>
    ) : (
      <Popover open={isPopUp} onOpenChange={handlePopUp}>
        <PopoverTrigger>
          <div className="w-full cursor-pointer">
            <UserComponent userdata={userdata}/>
          </div>
        </PopoverTrigger>
        <PopoverContent align='start' className="bg-white dark:bg-neutral-950 dark:text-slate-200 w-auto p-2 rounded-md shadow-lg">
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
          src={userdata.dp ? userdata.dp : '/default.jpeg'} 
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