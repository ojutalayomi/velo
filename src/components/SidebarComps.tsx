import React, { forwardRef, useRef } from 'react';
import Link from 'next/link';
import Image from "next/image";
import { ChevronRight, BadgePlus, RefreshCw, Bell, Lock, User, Moon, HelpCircle, LogIn, LogOut } from 'lucide-react';
import { UserData } from '@/redux/userSlice';

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
      <BadgePlus size={25}/>
    ),
    label: 'Post'
  },
  {
    route: 'chats',
    icon: (
      <svg width='25px' height='25px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path className='hov-1 dark:fill-tom' d='M13.0867 21.3877L13.7321 21.7697L13.0867 21.3877ZM13.6288 20.4718L12.9833 20.0898L13.6288 20.4718ZM10.3712 20.4718L9.72579 20.8539H9.72579L10.3712 20.4718ZM10.9133 21.3877L11.5587 21.0057L10.9133 21.3877ZM2.3806 15.9134L3.07351 15.6264V15.6264L2.3806 15.9134ZM7.78958 18.9915L7.77666 19.7413L7.78958 18.9915ZM5.08658 18.6194L4.79957 19.3123H4.79957L5.08658 18.6194ZM21.6194 15.9134L22.3123 16.2004V16.2004L21.6194 15.9134ZM16.2104 18.9915L16.1975 18.2416L16.2104 18.9915ZM18.9134 18.6194L19.2004 19.3123H19.2004L18.9134 18.6194ZM19.6125 2.7368L19.2206 3.37628L19.6125 2.7368ZM21.2632 4.38751L21.9027 3.99563V3.99563L21.2632 4.38751ZM4.38751 2.7368L3.99563 2.09732V2.09732L4.38751 2.7368ZM2.7368 4.38751L2.09732 3.99563H2.09732L2.7368 4.38751ZM9.40279 19.2098L9.77986 18.5615L9.77986 18.5615L9.40279 19.2098ZM13.7321 21.7697L14.2742 20.8539L12.9833 20.0898L12.4412 21.0057L13.7321 21.7697ZM9.72579 20.8539L10.2679 21.7697L11.5587 21.0057L11.0166 20.0898L9.72579 20.8539ZM12.4412 21.0057C12.2485 21.3313 11.7515 21.3313 11.5587 21.0057L10.2679 21.7697C11.0415 23.0767 12.9585 23.0767 13.7321 21.7697L12.4412 21.0057ZM10.5 2.75H13.5V1.25H10.5V2.75ZM21.25 10.5V11.5H22.75V10.5H21.25ZM2.75 11.5V10.5H1.25V11.5H2.75ZM1.25 11.5C1.25 12.6546 1.24959 13.5581 1.29931 14.2868C1.3495 15.0223 1.45323 15.6344 1.68769 16.2004L3.07351 15.6264C2.92737 15.2736 2.84081 14.8438 2.79584 14.1847C2.75041 13.5189 2.75 12.6751 2.75 11.5H1.25ZM7.8025 18.2416C6.54706 18.2199 5.88923 18.1401 5.37359 17.9265L4.79957 19.3123C5.60454 19.6457 6.52138 19.7197 7.77666 19.7413L7.8025 18.2416ZM1.68769 16.2004C2.27128 17.6093 3.39066 18.7287 4.79957 19.3123L5.3736 17.9265C4.33223 17.4951 3.50486 16.6678 3.07351 15.6264L1.68769 16.2004ZM21.25 11.5C21.25 12.6751 21.2496 13.5189 21.2042 14.1847C21.1592 14.8438 21.0726 15.2736 20.9265 15.6264L22.3123 16.2004C22.5468 15.6344 22.6505 15.0223 22.7007 14.2868C22.7504 13.5581 22.75 12.6546 22.75 11.5H21.25ZM16.2233 19.7413C17.4786 19.7197 18.3955 19.6457 19.2004 19.3123L18.6264 17.9265C18.1108 18.1401 17.4529 18.2199 16.1975 18.2416L16.2233 19.7413ZM20.9265 15.6264C20.4951 16.6678 19.6678 17.4951 18.6264 17.9265L19.2004 19.3123C20.6093 18.7287 21.7287 17.6093 22.3123 16.2004L20.9265 15.6264ZM13.5 2.75C15.1512 2.75 16.337 2.75079 17.2619 2.83873C18.1757 2.92561 18.7571 3.09223 19.2206 3.37628L20.0044 2.09732C19.2655 1.64457 18.4274 1.44279 17.4039 1.34547C16.3915 1.24921 15.1222 1.25 13.5 1.25V2.75ZM22.75 10.5C22.75 8.87781 22.7508 7.6085 22.6545 6.59611C22.5572 5.57256 22.3554 4.73445 21.9027 3.99563L20.6237 4.77938C20.9078 5.24291 21.0744 5.82434 21.1613 6.73809C21.2492 7.663 21.25 8.84876 21.25 10.5H22.75ZM19.2206 3.37628C19.7925 3.72672 20.2733 4.20752 20.6237 4.77938L21.9027 3.99563C21.4286 3.22194 20.7781 2.57144 20.0044 2.09732L19.2206 3.37628ZM10.5 1.25C8.87781 1.25 7.6085 1.24921 6.59611 1.34547C5.57256 1.44279 4.73445 1.64457 3.99563 2.09732L4.77938 3.37628C5.24291 3.09223 5.82434 2.92561 6.73809 2.83873C7.663 2.75079 8.84876 2.75 10.5 2.75V1.25ZM2.75 10.5C2.75 8.84876 2.75079 7.663 2.83873 6.73809C2.92561 5.82434 3.09223 5.24291 3.37628 4.77938L2.09732 3.99563C1.64457 4.73445 1.44279 5.57256 1.34547 6.59611C1.24921 7.6085 1.25 8.87781 1.25 10.5H2.75ZM3.99563 2.09732C3.22194 2.57144 2.57144 3.22194 2.09732 3.99563L3.37628 4.77938C3.72672 4.20752 4.20752 3.72672 4.77938 3.37628L3.99563 2.09732ZM11.0166 20.0898C10.8136 19.7468 10.6354 19.4441 10.4621 19.2063C10.2795 18.9559 10.0702 18.7304 9.77986 18.5615L9.02572 19.8582C9.07313 19.8857 9.13772 19.936 9.24985 20.0898C9.37122 20.2564 9.50835 20.4865 9.72579 20.8539L11.0166 20.0898ZM7.77666 19.7413C8.21575 19.7489 8.49387 19.7545 8.70588 19.7779C8.90399 19.7999 8.98078 19.832 9.02572 19.8582L9.77986 18.5615C9.4871 18.3912 9.18246 18.3215 8.87097 18.287C8.57339 18.2541 8.21375 18.2487 7.8025 18.2416L7.77666 19.7413ZM14.2742 20.8539C14.4916 20.4865 14.6287 20.2564 14.7501 20.0898C14.8622 19.936 14.9268 19.8857 14.9742 19.8582L14.2201 18.5615C13.9298 18.7304 13.7204 18.9559 13.5379 19.2063C13.7204 18.9559 13.5379 19.2063C13.3646 19.4441 13.1864 19.7468 12.9833 20.0898L14.2742 20.8539ZM16.1975 18.2416C15.7862 18.2487 15.4266 18.2541 15.129 18.287C14.8175 18.3215 14.5129 18.3912 14.2201 18.5615L14.9742 19.8582C15.0192 19.832 15.096 19.7999 15.2941 19.7779C15.5061 19.7545 15.7842 19.7489 16.2233 19.7413L16.1975 18.2416Z' fill='#1C274C'/>
        <path className='hov dark:stroke-tom' opacity='0.5' d='M8 11H8.009M11.991 11H12M15.991 11H16' stroke='#1C274C' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
      </svg>
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
}> = ({ item, activeRoute, handleClick, userdata }) => (
  <div 
    className={`sidebar ft dark:text-slate-200 rout ${
      activeRoute === item.route ? 'active sticky top-0 bottom-0 backdrop-filter backdrop-blur-[5px]' : ''
    }`} 
    data-route={item.route}
  >
    <div 
      className='sidebar-icon' 
      onClick={() => handleClick(item.route === 'profile' ? userdata.username : item.route)}
    >
      {item.icon}
      <div className='rt'>{item.label}</div>
    </div>
  </div>
);

export const UserSection = forwardRef<HTMLDivElement, {
  error: any;
  loading: boolean;
  userdata: UserData;
  pathname: string;
  isPopUp: boolean;
  handlePopUp: () => void;
  refetchUser: () => void;
}>(({ error, loading, userdata, pathname, isPopUp, handlePopUp, refetchUser }, ref) => (
  <div ref={ref} className={`user gap-3 ${!error ? 'hover:bg-slate-200 dark:hover:bg-neutral-900' : ''} tablets1:items-center !justify-center tablets1:!justify-between !m-0 w-full`} onClick={handlePopUp}>
    {!loading && !userdata.username && !error ? (
      <div className='dark:text-slate-200 flex flex-col gap-2'>
        <p className='flex items-center hover:text-brand'>
          <LogIn size={25} className="mr-2" />
          <Link href={`${pathname !== '' ? '/accounts/login?backto='+pathname : '/accounts/login'}`} className='hidden tablets1:!flex'>Log in</Link>
        </p>
        <p className='flex items-center hover:text-brand'>
          <User size={25} className="mr-2" />
          <Link href='/accounts/signup' className='hidden tablets1:!flex'>Sign up</Link>
        </p>
      </div>
    ) : (
      <>
        <div className='img'>
          {loading ? (
            <div className={`flex items-center justify-center w-full h-[90%]`}><div className='loader show h-6 w-6'></div></div>
          ) : (
            error ? <RefreshCw className='cursor-pointer' size={25} onClick={refetchUser}/> : 
            <Image src={userdata.dp ? 'https://s3.amazonaws.com/profile-display-images/'+userdata.dp : '/default.jpeg'} className='displayPicture dark:border-slate-200' width={30} height={30} alt='Display Picture'/>
          )}
        </div>
        
        <div className='names flex-col hidden tablets1:!flex'>
          <div className='flex dark:text-slate-200'>
            {loading || error ? (
              <div className='animate-pulse w-14 h-4 bg-[#9E9E9E] rounded mb-1'></div>
            ) : (
              <>
                <p>{userdata.firstname}</p>
                {userdata.verified && 
                  <Image src='/verified.svg' className='verified border-0' width={20} height={20} alt='Verified tag'/>
                }
              </>
            )}
          </div>

          {loading || error ? <div className='animate-pulse w-14 h-4 bg-[#9E9E9E] rounded'></div> : <p className='username text-sm'>{userdata.username}</p>}
        </div>
        <svg height='25px' width='25px' viewBox='0 0 24 24' aria-hidden='true' className='three-dots hidden tablets1:!block'>
          <g><path className='pathEllip dark:fill-tom' d='M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z'></path></g>
        </svg>
        <span className={`ellipsis-popup ${isPopUp ? 'show' : ''} left-2.5 dark:!bg-neutral-950 dark:text-slate-200`}>
          <p className='dark:hover:bg-slate-900 hover:bg-slate-200'>
            <Link href='/accounts/logout'>Log out <b className='username'>@{userdata.username !== '' ? userdata.username : 'johndoe'}</b></Link>
          </p>
          <p className='dark:hover:bg-slate-900 hover:bg-slate-200'>
            <Link href='/accounts/login'>Add another account?</Link>
          </p>
        </span>
      </>
    )}
  </div>
));

UserSection.displayName = 'UserSection';