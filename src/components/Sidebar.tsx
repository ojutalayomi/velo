"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from "next/image";
import { useSelector } from 'react-redux';
import { useUser } from '@/hooks/useUser';
import { ChevronRight, Bell, Lock, User, Moon, HelpCircle, LogIn, LogOut } from 'lucide-react';

interface SidebarProps {
  activeRoute: string;
  isMoreShown: boolean;
  setActiveRoute: (status: string) => void;
  setMoreStatus: (status: boolean) => void;
}

const Root: React.FC<SidebarProps> = ({ activeRoute, isMoreShown, setActiveRoute, setMoreStatus }) => {
  const { userdata, loading, error, refetchUser } = useUser();
  const [isPopUp,setPopUp] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const routes = ['accounts/login','accounts/signup','accounts/signup/1','accounts/signup/2','accounts/forgot-password','accounts/reset-password']

  useEffect(() => {
    // console.log(location)
    pathname === '/' ? router.push('/home') : null;
    // setPreviousLocation(location.pathname);
    setActiveRoute(pathname?.slice(1) || '');
  }, [router, pathname, setActiveRoute]);

  // useEffect(() => {
  //     const handleClick = () => setPopUp(false);
  //     window.addEventListener('click', handleClick);
    
  //     return () => {
  //       window.removeEventListener('click', handleClick);
  //     }; 
  // }, []);

  const handleClick = (route: string) => {
    router.push(`/${route}`);
    setActiveRoute(route);
  };

  const handlePopUp = () => {
    setPopUp(!isPopUp);
  };

    return (
      <>
        <div id='sidebar' className={`${routes.includes(activeRoute) && 'hidden'} tablets:!flex flex-col `}>
          <h1 className="brandname dark:text-slate-200 dark:after:text-slate-200 text-lg after:content-['V']"></h1>
          <div className='flex-1'>
            <div className={`sidebar ft dark:text-slate-200 rout ${activeRoute === 'home' ? 'active' : ''}`} data-route='home'>
              <div className='sidebar-icon'  onClick={() => handleClick('home')}>
                <svg width='25px' height='25px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path className='hov dark:stroke-tom' d='M22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round'></path>
                  <path className='hov dark:stroke-tom' d='M15 18H9' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round'></path>
                </svg>
                <div className='rt'>Home</div>
              </div>
            </div>
            <div className={`sidebar ft dark:text-slate-200 rout ${activeRoute === 'explore' ? 'active' : ''}`} data-route='explore'>
              <div className='sidebar-icon'  onClick={() => handleClick('explore')}>
                <svg width='25px' height='25px' className='dark:fill-tom' fill='#1C274C' viewBox='0 0 128 128' id='Layer_1' version='1.1' xmlSpace='preserve' xmlns='http://www.w3.org/2000/svg' xmlnsXlink='http://www.w3.org/1999/xlink' stroke='#000000' strokeWidth='0.00128'>
                  <g id='SVGRepo_iconCarrier'> 
                    <g> 
                      <path className='hov dark:stroke-tom' d='M109,55c0-29.8-24.2-54-54-54C25.2,1,1,25.2,1,55s24.2,54,54,54c13.5,0,25.8-5,35.2-13.1l25.4,25.4l5.7-5.7L95.9,90.2 C104,80.8,109,68.5,109,55z M55,101C29.6,101,9,80.4,9,55S29.6,9,55,9s46,20.6,46,46S80.4,101,55,101z'></path> 
                      <path className='hov dark:stroke-tom' d='M25.6,30.9l6.2,5.1C37.5,29,46,25,55,25v-8C43.6,17,32.9,22.1,25.6,30.9z'></path> <path className='hov dark:stroke-tom' d='M17,55h8c0-2.1,0.2-4.1,0.6-6.1l-7.8-1.6C17.3,49.8,17,52.4,17,55z'></path> 
                    </g> 
                  </g>
                </svg>
                <div className='rt'>Explore</div>
              </div>
            </div>
            <div className={`sidebar ft dark:text-slate-200 rout ${activeRoute === 'create-post' ? 'active' : ''}`} data-action='post-menu' data-route='create-post'>
              <div className='sidebar-icon'  onClick={() => handleClick('create-post')}>
                <svg width='25px' height='25px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <g><path className='hov-1 dark:fill-tom' fill='#1C274C' d='M23 3c-6.62-.1-10.38 2.421-13.05 6.03C7.29 12.61 6 17.331 6 22h2c0-1.007.07-2.012.19-3H12c4.1 0 7.48-3.082 7.94-7.054C22.79 10.147 23.17 6.359 23 3zm-7 8h-1.5v2H16c.63-.016 1.2-.08 1.72-.188C16.95 15.24 14.68 17 12 17H8.55c.57-2.512 1.57-4.851 3-6.78 2.16-2.912 5.29-4.911 9.45-5.187C20.95 8.079 19.9 11 16 11zM4 9V6H1V4h3V1h2v3h3v2H6v3H4z'></path></g>
                </svg>
                <div className='rt'>Post</div>
              </div>
            </div>
            <div className={`sidebar ft dark:text-slate-200 rout ${activeRoute === 'chats' ? 'active' : ''}`} data-route='chats'>
              <div className='sidebar-icon'  onClick={() => handleClick('chats')}>
                <svg width='25px' height='25px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path className='hov-1 dark:fill-tom' d='M13.0867 21.3877L13.7321 21.7697L13.0867 21.3877ZM13.6288 20.4718L12.9833 20.0898L13.6288 20.4718ZM10.3712 20.4718L9.72579 20.8539H9.72579L10.3712 20.4718ZM10.9133 21.3877L11.5587 21.0057L10.9133 21.3877ZM2.3806 15.9134L3.07351 15.6264V15.6264L2.3806 15.9134ZM7.78958 18.9915L7.77666 19.7413L7.78958 18.9915ZM5.08658 18.6194L4.79957 19.3123H4.79957L5.08658 18.6194ZM21.6194 15.9134L22.3123 16.2004V16.2004L21.6194 15.9134ZM16.2104 18.9915L16.1975 18.2416L16.2104 18.9915ZM18.9134 18.6194L19.2004 19.3123H19.2004L18.9134 18.6194ZM19.6125 2.7368L19.2206 3.37628L19.6125 2.7368ZM21.2632 4.38751L21.9027 3.99563V3.99563L21.2632 4.38751ZM4.38751 2.7368L3.99563 2.09732V2.09732L4.38751 2.7368ZM2.7368 4.38751L2.09732 3.99563H2.09732L2.7368 4.38751ZM9.40279 19.2098L9.77986 18.5615L9.77986 18.5615L9.40279 19.2098ZM13.7321 21.7697L14.2742 20.8539L12.9833 20.0898L12.4412 21.0057L13.7321 21.7697ZM9.72579 20.8539L10.2679 21.7697L11.5587 21.0057L11.0166 20.0898L9.72579 20.8539ZM12.4412 21.0057C12.2485 21.3313 11.7515 21.3313 11.5587 21.0057L10.2679 21.7697C11.0415 23.0767 12.9585 23.0767 13.7321 21.7697L12.4412 21.0057ZM10.5 2.75H13.5V1.25H10.5V2.75ZM21.25 10.5V11.5H22.75V10.5H21.25ZM2.75 11.5V10.5H1.25V11.5H2.75ZM1.25 11.5C1.25 12.6546 1.24959 13.5581 1.29931 14.2868C1.3495 15.0223 1.45323 15.6344 1.68769 16.2004L3.07351 15.6264C2.92737 15.2736 2.84081 14.8438 2.79584 14.1847C2.75041 13.5189 2.75 12.6751 2.75 11.5H1.25ZM7.8025 18.2416C6.54706 18.2199 5.88923 18.1401 5.37359 17.9265L4.79957 19.3123C5.60454 19.6457 6.52138 19.7197 7.77666 19.7413L7.8025 18.2416ZM1.68769 16.2004C2.27128 17.6093 3.39066 18.7287 4.79957 19.3123L5.3736 17.9265C4.33223 17.4951 3.50486 16.6678 3.07351 15.6264L1.68769 16.2004ZM21.25 11.5C21.25 12.6751 21.2496 13.5189 21.2042 14.1847C21.1592 14.8438 21.0726 15.2736 20.9265 15.6264L22.3123 16.2004C22.5468 15.6344 22.6505 15.0223 22.7007 14.2868C22.7504 13.5581 22.75 12.6546 22.75 11.5H21.25ZM16.2233 19.7413C17.4786 19.7197 18.3955 19.6457 19.2004 19.3123L18.6264 17.9265C18.1108 18.1401 17.4529 18.2199 16.1975 18.2416L16.2233 19.7413ZM20.9265 15.6264C20.4951 16.6678 19.6678 17.4951 18.6264 17.9265L19.2004 19.3123C20.6093 18.7287 21.7287 17.6093 22.3123 16.2004L20.9265 15.6264ZM13.5 2.75C15.1512 2.75 16.337 2.75079 17.2619 2.83873C18.1757 2.92561 18.7571 3.09223 19.2206 3.37628L20.0044 2.09732C19.2655 1.64457 18.4274 1.44279 17.4039 1.34547C16.3915 1.24921 15.1222 1.25 13.5 1.25V2.75ZM22.75 10.5C22.75 8.87781 22.7508 7.6085 22.6545 6.59611C22.5572 5.57256 22.3554 4.73445 21.9027 3.99563L20.6237 4.77938C20.9078 5.24291 21.0744 5.82434 21.1613 6.73809C21.2492 7.663 21.25 8.84876 21.25 10.5H22.75ZM19.2206 3.37628C19.7925 3.72672 20.2733 4.20752 20.6237 4.77938L21.9027 3.99563C21.4286 3.22194 20.7781 2.57144 20.0044 2.09732L19.2206 3.37628ZM10.5 1.25C8.87781 1.25 7.6085 1.24921 6.59611 1.34547C5.57256 1.44279 4.73445 1.64457 3.99563 2.09732L4.77938 3.37628C5.24291 3.09223 5.82434 2.92561 6.73809 2.83873C7.663 2.75079 8.84876 2.75 10.5 2.75V1.25ZM2.75 10.5C2.75 8.84876 2.75079 7.663 2.83873 6.73809C2.92561 5.82434 3.09223 5.24291 3.37628 4.77938L2.09732 3.99563C1.64457 4.73445 1.44279 5.57256 1.34547 6.59611C1.24921 7.6085 1.25 8.87781 1.25 10.5H2.75ZM3.99563 2.09732C3.22194 2.57144 2.57144 3.22194 2.09732 3.99563L3.37628 4.77938C3.72672 4.20752 4.20752 3.72672 4.77938 3.37628L3.99563 2.09732ZM11.0166 20.0898C10.8136 19.7468 10.6354 19.4441 10.4621 19.2063C10.2795 18.9559 10.0702 18.7304 9.77986 18.5615L9.02572 19.8582C9.07313 19.8857 9.13772 19.936 9.24985 20.0898C9.37122 20.2564 9.50835 20.4865 9.72579 20.8539L11.0166 20.0898ZM7.77666 19.7413C8.21575 19.7489 8.49387 19.7545 8.70588 19.7779C8.90399 19.7999 8.98078 19.832 9.02572 19.8582L9.77986 18.5615C9.4871 18.3912 9.18246 18.3215 8.87097 18.287C8.57339 18.2541 8.21375 18.2487 7.8025 18.2416L7.77666 19.7413ZM14.2742 20.8539C14.4916 20.4865 14.6287 20.2564 14.7501 20.0898C14.8622 19.936 14.9268 19.8857 14.9742 19.8582L14.2201 18.5615C13.9298 18.7304 13.7204 18.9559 13.5379 19.2063C13.3646 19.4441 13.1864 19.7468 12.9833 20.0898L14.2742 20.8539ZM16.1975 18.2416C15.7862 18.2487 15.4266 18.2541 15.129 18.287C14.8175 18.3215 14.5129 18.3912 14.2201 18.5615L14.9742 19.8582C15.0192 19.832 15.096 19.7999 15.2941 19.7779C15.5061 19.7545 15.7842 19.7489 16.2233 19.7413L16.1975 18.2416Z' fill='#1C274C'/>
                  <path className='hov dark:stroke-tom' opacity='0.5' d='M8 11H8.009M11.991 11H12M15.991 11H16' stroke='#1C274C' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
                </svg>
                <div className='rt'>Chats</div>
              </div>
            </div>
            <div className={`sidebar ft dark:text-slate-200 rout ${activeRoute === 'general' ? 'active' : ''}`} data-route='general'>
              <div className='sidebar-icon'  onClick={() => handleClick('general')}>
                <svg width='25px' height='25px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path className='hov dark:stroke-tom' d='M7.84308 20.1979C9.8718 21.3993 10.8862 22 12 22C13.1138 22 14.1282 21.3993 16.1569 20.1979L16.8431 19.7915C18.8718 18.5901 19.8862 17.9894 20.4431 17C21 16.0106 21 14.8092 21 12.4063M20.8147 8C20.7326 7.62759 20.6141 7.3038 20.4431 7C19.8862 6.01057 18.8718 5.40987 16.8431 4.20846L16.1569 3.80211C14.1282 2.6007 13.1138 2 12 2C10.8862 2 9.8718 2.6007 7.84308 3.80211L7.15692 4.20846C5.1282 5.40987 4.11384 6.01057 3.55692 7C3 7.98943 3 9.19084 3 11.5937V12.4063C3 14.8092 3 16.0106 3.55692 17C3.78326 17.4021 4.08516 17.74 4.5 18.0802' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round'/>
                  <circle className='hov dark:stroke-tom' cx='12' cy='12' r='3' stroke='#1C274C' strokeWidth='1.5'/>
                </svg>
                <div className='general rt'>General</div>
              </div>
            </div>
            <div className={`sidebar ft dark:text-slate-200 rout ${activeRoute === ':username' ? 'active' : ''}`} data-route='<%= username %>'>
              <div className='sidebar-icon'  onClick={() => handleClick('explore')}>
                <svg xmlns='http://www.w3.org/2000/svg' width='25px' height='25px' viewBox='0 0 24 24' fill='none'>
                  <path className='hov dark:stroke-tom' opacity='0.4' d='M12.1605 10.87C12.0605 10.86 11.9405 10.86 11.8305 10.87C9.45055 10.79 7.56055 8.84 7.56055 6.44C7.56055 3.99 9.54055 2 12.0005 2C14.4505 2 16.4405 3.99 16.4405 6.44C16.4305 8.84 14.5405 10.79 12.1605 10.87Z' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
                  <path className='hov dark:stroke-tom' d='M7.1607 14.56C4.7407 16.18 4.7407 18.82 7.1607 20.43C9.9107 22.27 14.4207 22.27 17.1707 20.43C19.5907 18.81 19.5907 16.17 17.1707 14.56C14.4307 12.73 9.9207 12.73 7.1607 14.56Z' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
                  </svg>
                <div className='myprofile rt'>Profile</div>
              </div>
            </div>
            <div className={`sidebar ft dark:text-slate-200 rout ${activeRoute === 'user-interface' ? 'active' : ''}`} data-route='user-interface'>
              <div className='sidebar-icon'  onClick={() => handleClick('user-interface')}>
                <svg xmlns='http://www.w3.org/2000/svg' width='25px' height='25px' viewBox='0 0 24 24' fill='none'>
                  <path className='hov-1 dark:fill-tom' fillRule='evenodd' clipRule='evenodd' d='M15.6347 2.12433C15.9618 1.29189 17.1377 1.29189 17.4648 2.12433L17.8928 3.21354L18.9775 3.6429C19.8068 3.97121 19.8068 5.14713 18.9775 5.47544L17.8928 5.90481L17.4648 6.99401C17.1377 7.82645 15.9618 7.82646 15.6347 6.99402L15.2067 5.90481L14.122 5.47544C13.2927 5.14714 13.2927 3.97121 14.122 3.6429L15.2067 3.21354L15.6347 2.12433ZM16.5497 2.52989L16.9645 3.58533C17.0641 3.83891 17.2644 4.04027 17.5181 4.14073L18.5752 4.55917L17.5181 4.97762C17.2644 5.07808 17.0641 5.27943 16.9645 5.53301L16.5497 6.58845L16.135 5.53301C16.0354 5.27943 15.8351 5.07808 15.5813 4.97762L14.5243 4.55917L15.5813 4.14073C15.8351 4.04027 16.0354 3.83891 16.135 3.58533L16.5497 2.52989Z' fill='#1C274C'/>
                  <path className='hov-1 dark:fill-tom' fillRule='evenodd' clipRule='evenodd' d='M3.3142 3.3142C4.73313 1.89527 7.03366 1.89527 8.45259 3.3142L20.6858 15.5474C22.1047 16.9663 22.1047 19.2669 20.6858 20.6858C19.2669 22.1047 16.9663 22.1047 15.5474 20.6858L3.3142 8.45259C1.89527 7.03366 1.89527 4.73313 3.3142 3.3142ZM7.39193 4.37486C6.55879 3.54171 5.208 3.54171 4.37486 4.37486C3.54171 5.208 3.54171 6.55879 4.37486 7.39193L5.96114 8.97821L8.97821 5.96114L7.39193 4.37486ZM16.6081 19.6251L7.0218 10.0389L10.0389 7.0218L19.6251 16.6081C20.4583 17.4412 20.4583 18.792 19.6251 19.6251C18.792 20.4583 17.4412 20.4583 16.6081 19.6251Z' fill='#1C274C'/>
                  <path className='hov-1 dark:fill-tom' fillRule='evenodd' clipRule='evenodd' d='M21.332 8.94659C21.0049 8.11416 19.8289 8.11416 19.5018 8.94659L19.3473 9.33987L18.956 9.49475C18.1266 9.82306 18.1266 10.999 18.956 11.3273L19.3473 11.4822L19.5018 11.8755C19.8289 12.7079 21.0049 12.7079 21.332 11.8755L21.4865 11.4822L21.8778 11.3273C22.7071 10.999 22.7071 9.82306 21.8778 9.49475L21.4865 9.33987L21.332 8.94659ZM20.4169 9.35216L20.2756 9.71166C20.176 9.96524 19.9757 10.1666 19.7219 10.2671L19.3583 10.411L19.7219 10.555C19.9757 10.6555 20.176 10.8568 20.2756 11.1104L20.4169 11.4699L20.5582 11.1104C20.6578 10.8568 20.858 10.6555 21.1118 10.555L21.4755 10.411L21.1118 10.2671C20.858 10.1666 20.6578 9.96524 20.5582 9.71166L20.4169 9.35216Z' fill='#1C274C'/>
                  <path className='hov-1 dark:fill-tom' fillRule='evenodd' clipRule='evenodd' d='M4.66784 15.1243C4.99493 14.2919 6.17088 14.2919 6.49797 15.1243L6.65251 15.5176L7.04379 15.6725C7.87315 16.0008 7.87315 17.1767 7.04378 17.505L6.65251 17.6599L6.49797 18.0532C6.17088 18.8856 4.99493 18.8856 4.66784 18.0532L4.5133 17.6599L4.12203 17.505C3.29266 17.1767 3.29266 16.0008 4.12202 15.6725L4.5133 15.5176L4.66784 15.1243ZM5.44164 15.8894L5.5829 15.5299L5.72417 15.8894C5.82381 16.143 6.02407 16.3443 6.27785 16.4448L6.64154 16.5888L6.27785 16.7327C6.02407 16.8332 5.82381 17.0345 5.72417 17.2881L5.5829 17.6476L5.44164 17.2881C5.342 17.0345 5.14174 16.8332 4.88796 16.7327L4.52427 16.5888L4.88796 16.4448C5.14174 16.3443 5.342 16.143 5.44164 15.8894Z' fill='#1C274C'/>
                </svg>
                <div className='user-interface rt'>User Interface</div>
              </div>
            </div>
            <div className={`sidebar ft dark:text-slate-200 rout ${activeRoute === 'feedback' ? 'active' : ''}`} data-route='feedback'>
              <div className='sidebar-icon'  onClick={() => handleClick('feedback')}>
                <svg xmlns='http://www.w3.org/2000/svg' width='25px' height='25px' viewBox='0 0 24 24' fill='none'>
                  <path className='hov-1 dark:fill-tom' d='M16 1C17.6569 1 19 2.34315 19 4C19 4.55228 18.5523 5 18 5C17.4477 5 17 4.55228 17 4C17 3.44772 16.5523 3 16 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H16C16.5523 21 17 20.5523 17 20V19C17 18.4477 17.4477 18 18 18C18.5523 18 19 18.4477 19 19V20C19 21.6569 17.6569 23 16 23H4C2.34315 23 1 21.6569 1 20V4C1 2.34315 2.34315 1 4 1H16Z' fill='#1C274C'/>
                  <path className='hov-1 dark:fill-tom' fillRule='evenodd' clipRule='evenodd' d='M20.7991 8.20087C20.4993 7.90104 20.0132 7.90104 19.7133 8.20087L11.9166 15.9977C11.7692 16.145 11.6715 16.3348 11.6373 16.5404L11.4728 17.5272L12.4596 17.3627C12.6652 17.3285 12.855 17.2308 13.0023 17.0835L20.7991 9.28666C21.099 8.98682 21.099 8.5007 20.7991 8.20087ZM18.2991 6.78666C19.38 5.70578 21.1325 5.70577 22.2134 6.78665C23.2942 7.86754 23.2942 9.61999 22.2134 10.7009L14.4166 18.4977C13.9744 18.9398 13.4052 19.2327 12.7884 19.3355L11.8016 19.5C10.448 19.7256 9.2744 18.5521 9.50001 17.1984L9.66448 16.2116C9.76728 15.5948 10.0602 15.0256 10.5023 14.5834L18.2991 6.78666Z' fill='#1C274C'/>
                  <path className='hov-1 dark:fill-tom' d='M5 7C5 6.44772 5.44772 6 6 6H14C14.5523 6 15 6.44772 15 7C15 7.55228 14.5523 8 14 8H6C5.44772 8 5 7.55228 5 7Z' fill='#1C274C'/>
                  <path className='hov-1 dark:fill-tom' d='M5 11C5 10.4477 5.44772 10 6 10H10C10.5523 10 11 10.4477 11 11C11 11.5523 10.5523 12 10 12H6C5.44772 12 5 11.5523 5 11Z' fill='#1C274C'/>
                  <path className='hov-1 dark:fill-tom' d='M5 15C5 14.4477 5.44772 14 6 14H7C7.55228 14 8 14.4477 8 15C8 15.5523 7.55228 16 7 16H6C5.44772 16 5 15.5523 5 15Z' fill='#1C274C'/>
                </svg>
                <div className='feedback rt'>Feedback</div>
              </div>
            </div>
          </div>
          
          
          <div className={`user ${!error &&'hover:bg-slate-200 dark:hover:bg-neutral-900'} tablets1:items-center !justify-center tablets1:!justify-between !m-0 w-full`} onClick={handlePopUp}>
              {error ?
              <>
                <div className='img'>
                  {/* https://s3.amazonaws.com/profile-display-images/ */}
                  {!loading 
                  ? 
                  <Image src={userdata.dp ? 'https://s3.amazonaws.com/profile-display-images/'+userdata.dp : '/default.jpeg'} className='displayPicture dark:border-slate-200' width={30} height={30} alt='Display Picture'/>
                  : 
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '90%'}}><div style={{height: '25px', width: '25px'}} className='loader show'></div></div>
                  }
                </div>
                
                <div className='names flex-col  hidden tablets1:!flex'>
                  <div className='flex dark:text-slate-200'>
                    <p>{userdata.firstname !== '' ? userdata.firstname : 'John Doe'}</p>
                    {userdata.verified ? <Image src='/verified.svg' className='verified border-0' width={20} height={20} alt='Verified tag'/> : null}
                  </div>
                  <p className='username text-xs'>@{userdata.username !== '' ? userdata.username : 'johndoe'}</p>
                </div>
                <svg height='25px' width='25px' viewBox='0 0 24 24' aria-hidden='true' className='three-dots hidden tablets1:!block'>
                    <g><path className='pathEllip dark:fill-tom' d='M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z'></path></g>
                </svg>
                <span className={`ellipsis-popup ${isPopUp ? 'show' : ''} left-2.5 dark:bg-neutral dark:text-slate-200`}>
                  <p className='hover:bg-slate-200'>
                    <Link href='/accounts/logout'>Log out <b className='username'>@{userdata.usename !== '' ? userdata.username : 'johndoe'}</b></Link>
                  </p>
                  <p className='hover:bg-slate-200'>
                    <Link href='/accounts/login'>Add another account?</Link>
                  </p>
                </span>
                </>
              : <div className='dark:text-slate-200 flex flex-col gap-2'>
                  <p className='flex items-center hover:bg-slate-200'>
                    <LogIn size={25} className="mr-2" />
                    <Link href='/accounts/login' className='hidden tablets1:!flex'>Log in</Link>
                  </p>
                  <p className='flex items-center hover:bg-slate-200'>
                    <User size={25} className="mr-2" />
                    <Link href='/accounts/signup' className='hidden tablets1:!flex'>Sign up</Link>
                  </p>
                </div>
                }
          </div>
          {/* <a href="/api/auth/login">Login</a>
          <a href="/api/auth/logout">Logout</a> */}
        </div>
      </>
    );
}

export default Root;