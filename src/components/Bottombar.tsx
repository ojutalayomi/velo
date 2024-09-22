"use client";
import React, { useEffect, useRef,useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from "next/image";
import { useSelector } from 'react-redux';
import { useUser } from '@/hooks/useUser';
import { ChevronRight, Bell, Lock, User, Moon, HelpCircle, LogIn, LogOut, BadgePlus, Mail } from 'lucide-react';

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
  const router = useRouter();
  const pathname = usePathname();
  const routes = ['accounts/login','accounts/signup','accounts/forgot-password','accounts/reset-password']
  const ref = useRef<HTMLDivElement>(null);
  const ref1 = useRef<HTMLDivElement>(null);


  
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
        <div id='bottombar' className={`bg-slate-200 dark:bg-zinc-900 ${pathname?.includes('posts') || pathname?.includes('chats') || routes.includes(activeRoute) && 'hidden'} `}>

          <div className={`bg-black/50 h-[100dvh] ${!isMoreShown && 'hidden'} top-0 fixed z-[1] w-[100dvw]`}>
            <div ref={ref1} onClick={(event) => event.stopPropagation()} id='more' className={`left-0 bg-white dark:bg-black/70 ${isMoreShown ? 'show' : 'hide'} font-light leading-normal`}>
              <div className='head dark:text-slate-50'>--</div>
              <div className={`bottombar ft dark:text-slate-200 rout ${activeRoute === 'general' ? 'active' : ''}`} data-route='general'>
                <div className='bottombar-icon'  onClick={() => handleClick('general')}>
                  <svg width='22px' height='22px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                    <path className='hov dark:stroke-tom' d='M7.84308 20.1979C9.8718 21.3993 10.8862 22 12 22C13.1138 22 14.1282 21.3993 16.1569 20.1979L16.8431 19.7915C18.8718 18.5901 19.8862 17.9894 20.4431 17C21 16.0106 21 14.8092 21 12.4063M20.8147 8C20.7326 7.62759 20.6141 7.3038 20.4431 7C19.8862 6.01057 18.8718 5.40987 16.8431 4.20846L16.1569 3.80211C14.1282 2.6007 13.1138 2 12 2C10.8862 2 9.8718 2.6007 7.84308 3.80211L7.15692 4.20846C5.1282 5.40987 4.11384 6.01057 3.55692 7C3 7.98943 3 9.19084 3 11.5937V12.4063C3 14.8092 3 16.0106 3.55692 17C3.78326 17.4021 4.08516 17.74 4.5 18.0802' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round'/>
                    <circle className='hov dark:stroke-tom' cx='12' cy='12' r='3' stroke='#1C274C' strokeWidth='1.5'/>
                  </svg>
                  <div className='general rt'>General</div>
                </div>
              </div>
              <div className={`bottombar ft dark:text-slate-200 rout ${activeRoute === ':username' ? 'active' : ''}`} data-route='<%= username %>'>
                <div className='bottombar-icon'  onClick={() => handleClick('explore')}>
                  <Bell size={22}/>
                  <div className='notifications rt'>Notifications</div>
                </div>
              </div>
              <div className={`bottombar ft dark:text-slate-200 rout ${activeRoute === ':username' ? 'active' : ''}`} data-route='<%= username %>'>
                <div className='bottombar-icon'  onClick={() => handleClick('explore')}>
                  <svg xmlns='http://www.w3.org/2000/svg' width='22px' height='22px' viewBox='0 0 24 24' fill='none'>
                    <path className='hov dark:stroke-tom' opacity='0.4' d='M12.1605 10.87C12.0605 10.86 11.9405 10.86 11.8305 10.87C9.45055 10.79 7.56055 8.84 7.56055 6.44C7.56055 3.99 9.54055 2 12.0005 2C14.4505 2 16.4405 3.99 16.4405 6.44C16.4305 8.84 14.5405 10.79 12.1605 10.87Z' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
                    <path className='hov dark:stroke-tom' d='M7.1607 14.56C4.7407 16.18 4.7407 18.82 7.1607 20.43C9.9107 22.27 14.4207 22.27 17.1707 20.43C19.5907 18.81 19.5907 16.17 17.1707 14.56C14.4307 12.73 9.9207 12.73 7.1607 14.56Z' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
                    </svg>
                  <div className='myprofile rt'>My Profile</div>
                </div>
              </div>
              <div className={`bottombar ft dark:text-slate-200 rout ${activeRoute === 'user-interface' ? 'active' : ''}`} data-route='user-interface'>
                <div className='bottombar-icon'  onClick={() => handleClick('user-interface')}>
                  <svg xmlns='http://www.w3.org/2000/svg' width='22px' height='22px' viewBox='0 0 24 24' fill='none'>
                    <path className='hov-1 dark:fill-tom' fillRule='evenodd' clipRule='evenodd' d='M15.6347 2.12433C15.9618 1.29189 17.1377 1.29189 17.4648 2.12433L17.8928 3.21354L18.9775 3.6429C19.8068 3.97121 19.8068 5.14713 18.9775 5.47544L17.8928 5.90481L17.4648 6.99401C17.1377 7.82645 15.9618 7.82646 15.6347 6.99402L15.2067 5.90481L14.122 5.47544C13.2927 5.14714 13.2927 3.97121 14.122 3.6429L15.2067 3.21354L15.6347 2.12433ZM16.5497 2.52989L16.9645 3.58533C17.0641 3.83891 17.2644 4.04027 17.5181 4.14073L18.5752 4.55917L17.5181 4.97762C17.2644 5.07808 17.0641 5.27943 16.9645 5.53301L16.5497 6.58845L16.135 5.53301C16.0354 5.27943 15.8351 5.07808 15.5813 4.97762L14.5243 4.55917L15.5813 4.14073C15.8351 4.04027 16.0354 3.83891 16.135 3.58533L16.5497 2.52989Z' fill='#1C274C'/>
                    <path className='hov-1 dark:fill-tom' fillRule='evenodd' clipRule='evenodd' d='M3.3142 3.3142C4.73313 1.89527 7.03366 1.89527 8.45259 3.3142L20.6858 15.5474C22.1047 16.9663 22.1047 19.2669 20.6858 20.6858C19.2669 22.1047 16.9663 22.1047 15.5474 20.6858L3.3142 8.45259C1.89527 7.03366 1.89527 4.73313 3.3142 3.3142ZM7.39193 4.37486C6.55879 3.54171 5.208 3.54171 4.37486 4.37486C3.54171 5.208 3.54171 6.55879 4.37486 7.39193L5.96114 8.97821L8.97821 5.96114L7.39193 4.37486ZM16.6081 19.6251L7.0218 10.0389L10.0389 7.0218L19.6251 16.6081C20.4583 17.4412 20.4583 18.792 19.6251 19.6251C18.792 20.4583 17.4412 20.4583 16.6081 19.6251Z' fill='#1C274C'/>
                    <path className='hov-1 dark:fill-tom' fillRule='evenodd' clipRule='evenodd' d='M21.332 8.94659C21.0049 8.11416 19.8289 8.11416 19.5018 8.94659L19.3473 9.33987L18.956 9.49475C18.1266 9.82306 18.1266 10.999 18.956 11.3273L19.3473 11.4822L19.5018 11.8755C19.8289 12.7079 21.0049 12.7079 21.332 11.8755L21.4865 11.4822L21.8778 11.3273C22.7071 10.999 22.7071 9.82306 21.8778 9.49475L21.4865 9.33987L21.332 8.94659ZM20.4169 9.35216L20.2756 9.71166C20.176 9.96524 19.9757 10.1666 19.7219 10.2671L19.3583 10.411L19.7219 10.555C19.9757 10.6555 20.176 10.8568 20.2756 11.1104L20.4169 11.4699L20.5582 11.1104C20.6578 10.8568 20.858 10.6555 21.1118 10.555L21.4755 10.411L21.1118 10.2671C20.858 10.1666 20.6578 9.96524 20.5582 9.71166L20.4169 9.35216Z' fill='#1C274C'/>
                    <path className='hov-1 dark:fill-tom' fillRule='evenodd' clipRule='evenodd' d='M4.66784 15.1243C4.99493 14.2919 6.17088 14.2919 6.49797 15.1243L6.65251 15.5176L7.04379 15.6725C7.87315 16.0008 7.87315 17.1767 7.04378 17.505L6.65251 17.6599L6.49797 18.0532C6.17088 18.8856 4.99493 18.8856 4.66784 18.0532L4.5133 17.6599L4.12203 17.505C3.29266 17.1767 3.29266 16.0008 4.12202 15.6725L4.5133 15.5176L4.66784 15.1243ZM5.44164 15.8894L5.5829 15.5299L5.72417 15.8894C5.82381 16.143 6.02407 16.3443 6.27785 16.4448L6.64154 16.5888L6.27785 16.7327C6.02407 16.8332 5.82381 17.0345 5.72417 17.2881L5.5829 17.6476L5.44164 17.2881C5.342 17.0345 5.14174 16.8332 4.88796 16.7327L4.52427 16.5888L4.88796 16.4448C5.14174 16.3443 5.342 16.143 5.44164 15.8894Z' fill='#1C274C'/>
                  </svg>
                  <div className='user-interface rt'>User Interface</div>
                </div>
              </div>
              <div className={`bottombar ft dark:text-slate-200 rout ${activeRoute === 'feedback' ? 'active' : ''}`} data-route='feedback'>
                <div className='bottombar-icon'  onClick={() => handleClick('feedback')}>
                  <svg xmlns='http://www.w3.org/2000/svg' width='22px' height='22px' viewBox='0 0 24 24' fill='none'>
                    <path className='hov-1 dark:fill-tom' d='M16 1C17.6569 1 19 2.34315 19 4C19 4.55228 18.5523 5 18 5C17.4477 5 17 4.55228 17 4C17 3.44772 16.5523 3 16 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H16C16.5523 21 17 20.5523 17 20V19C17 18.4477 17.4477 18 18 18C18.5523 18 19 18.4477 19 19V20C19 21.6569 17.6569 23 16 23H4C2.34315 23 1 21.6569 1 20V4C1 2.34315 2.34315 1 4 1H16Z' fill='#1C274C'/>
                    <path className='hov-1 dark:fill-tom' fillRule='evenodd' clipRule='evenodd' d='M20.7991 8.20087C20.4993 7.90104 20.0132 7.90104 19.7133 8.20087L11.9166 15.9977C11.7692 16.145 11.6715 16.3348 11.6373 16.5404L11.4728 17.5272L12.4596 17.3627C12.6652 17.3285 12.855 17.2308 13.0023 17.0835L20.7991 9.28666C21.099 8.98682 21.099 8.5007 20.7991 8.20087ZM18.2991 6.78666C19.38 5.70578 21.1325 5.70577 22.2134 6.78665C23.2942 7.86754 23.2942 9.61999 22.2134 10.7009L14.4166 18.4977C13.9744 18.9398 13.4052 19.2327 12.7884 19.3355L11.8016 19.5C10.448 19.7256 9.2744 18.5521 9.50001 17.1984L9.66448 16.2116C9.76728 15.5948 10.0602 15.0256 10.5023 14.5834L18.2991 6.78666Z' fill='#1C274C'/>
                    <path className='hov-1 dark:fill-tom' d='M5 7C5 6.44772 5.44772 6 6 6H14C14.5523 6 15 6.44772 15 7C15 7.55228 14.5523 8 14 8H6C5.44772 8 5 7.55228 5 7Z' fill='#1C274C'/>
                    <path className='hov-1 dark:fill-tom' d='M5 11C5 10.4477 5.44772 10 6 10H10C10.5523 10 11 10.4477 11 11C11 11.5523 10.5523 12 10 12H6C5.44772 12 5 11.5523 5 11Z' fill='#1C274C'/>
                    <path className='hov-1 dark:fill-tom' d='M5 15C5 14.4477 5.44772 14 6 14H7C7.55228 14 8 14.4477 8 15C8 15.5523 7.55228 16 7 16H6C5.44772 16 5 15.5523 5 15Z' fill='#1C274C'/>
                  </svg>
                  <div className='feedback rt'>Feedback</div>
                </div>
              </div>
              {!loading && !userdata.username ?
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
              <div ref={ref} className='user' onClick={handlePopUp}>
                <div className='img'>
                  {/* https://s3.amazonaws.com/profile-display-images/ */}
                  {!loading 
                  ? 
                  <Image src={userdata.dp ? 'https://s3.amazonaws.com/profile-display-images/'+userdata.dp : '/default.jpeg'} className='displayPicture' width={30} height={30} alt='Display Picture'/>
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
                <svg height='25px' width='25px' viewBox='0 0 24 24' aria-hidden='true' className='three-dots'>
                    <g><path className='pathEllip dark:fill-tom' d='M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z'></path></g>
                </svg>
                <span ref={ref} className={`ellipsis-popup ${isPopUp ? 'show' : ''} dark:!bg-zinc-900 dark:text-slate-200`}>
                  <p className='hover:bg-slate-200'>
                    <Link href='/accounts/logout'>Log out <b className='username'>@{userdata.username !== '' ? userdata.username : 'johndoe'}</b></Link>
                  </p>
                  <p className='hover:bg-slate-200'>
                    <Link href={`${pathname !== '' ? '/accounts/login?backto='+pathname : '/accounts/login'}`}>Add another account?</Link>
                  </p>
                </span>
              </div>
              }
            </div>
          </div>

          <div id='content' className='!shadow-none py-[10px]'>
            <div className={`bottombar ft dark:text-slate-200 rout ${activeRoute === 'home' ? 'active' : ''}`} data-route='home'>
              <div className='bottombar-icon'  onClick={() => handleClick('home')}>
                <svg width='22px' height='22px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path className='hov dark:stroke-tom' d='M22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round'></path>
                  <path className='hov dark:stroke-tom' d='M15 18H9' stroke='#1C274C' strokeWidth='1.5' strokeLinecap='round'></path>
                </svg>
                <div className='rt'>Home</div>
              </div>
            </div>
            <div className={`bottombar ft dark:text-slate-200 rout ${activeRoute === 'explore' ? 'active' : ''}`} data-route='explore'>
              <div className='bottombar-icon'  onClick={() => handleClick('explore')}>
              <svg width='22px' height='22px' className='dark:fill-tom dark:stroke-tom' fill='#1C274C' viewBox='0 0 128 128' id='Layer_1' version='1.1' xmlSpace='preserve' xmlns='http://www.w3.org/2000/svg' xmlnsXlink='http://www.w3.org/1999/xlink' stroke='#000000' strokeWidth='0.00128'>
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
            <div className={`bottombar ft dark:text-slate-200 rout ${activeRoute === 'create-post' ? 'active' : ''}`} data-action='post-menu' data-route='create-post'>
              <div className='bottombar-icon'  onClick={() => handleClick('create-post')}>
                <BadgePlus size={25}/>
                <div className='rt'>Post</div>
              </div>
            </div>
            <div className={`bottombar ft dark:text-slate-200 rout ${activeRoute === 'chats' ? 'active' : ''}`} data-route='chats'>
              <div className='bottombar-icon'  onClick={() => handleClick('chats')}>
                <Mail size={25}/>
                <div className='rt'>Chats</div>
              </div>
            </div>
            <div className={`bottombar ft dark:text-slate-200 rout `}>
              <div className='bottombar-icon'  onClick={() => handleClickMore('open')}>
                <div ref={ref1} className='img'>
                {!loading 
                ? 
                <Image src={userdata.dp ? 'https://s3.amazonaws.com/profile-display-images/'+userdata.dp : '/default.jpeg'} className='displayPicture' width={22} height={22} alt='Display Picture'/>
                : 
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '90%'}}><div style={{height: '22px', width: '22px'}} className='loader load'></div></div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
}

export default Root;