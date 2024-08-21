"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { Post, PostProps, formatNo, timeFormatter, updateLiveTime } from './PostProps';
import Image from "next/image";
import { useUser } from '@/hooks/useUser';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/swiper-bundle.css';
import { Navigation, Pagination } from 'swiper/modules';
// import { v4 as uuidv4 } from 'uuid';
import ImageDiv from '../components/imageDiv';
import VideoDiv from './videoDiv';
import { useRouter } from 'next/navigation';
import { Location } from 'history';
import { useSelector } from 'react-redux';
import { setActiveRoute, setMoreStatus } from '../redux/navigationSlice';
import Link from 'next/link';

type PostComponentProps = Post | PostProps;

const Posts: React.FC<PostComponentProps> = (props) => {
  const postData = 'post' in props ? props.post : props.postData;
  const { activeRoute, isMoreShown } = useSelector((state: any) => state.navigation);
  const [activePost, setActivePost] = useState<string>('');
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [isliked, setLiked] = useState(false);
  const [isShared, setShared] = useState(false);
  const [isBookmarked, setBookmarked] = useState(false);
  const [time, setTime] = useState<any>();
  const router = useRouter();

  useEffect(() => {
      const interval = setInterval(() => {
          setTime(updateLiveTime('getlivetime', postData.TimeOfPost));
      }, 1000);
      return () => clearInterval(interval); // This is important to clear the interval when the component unmounts
  }, [postData.TimeOfPost]);

  useEffect(() => {
      const handleClick = () => setDropdownVisible(false);
      window.addEventListener('click', handleClick);
    
      return () => {
        window.removeEventListener('click', handleClick);
      }; 
  }, []);

  const toggleDropdown = () => {
    setDropdownVisible(!isDropdownVisible);
  };

  const handleDropdownClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.stopPropagation();
    toggleDropdown();
  };

  const handleActivePost = (route: string) => {
    const [username,posts,id] = route.split('/');
    activePost === id ? null : router.push('/'+route);
    setActivePost(id);
  }

  const handleClick = (clicked: string) => {
    if(clicked === 'liked'){
      return setLiked(!isliked);
    }
    if(clicked === 'shared'){
      return setShared(!isShared);
    }
    if(clicked === 'bookmarked'){
      return setBookmarked(!isBookmarked);
    }
  };

  const checkLength = useCallback(() => {
    if(postData?.Image) {
      return postData?.Image.length > 1;
    }
    return false;
  }, [postData?.Image])

  const fullscreen = () => {
    router.push(`/${postData.Username}/photo`);
  }

  return (
    <div className='pre-blog' id={postData.PostID.slice(0,-4)}>
      <div className='blog select-none dark:text-slate-200' data-id={postData.PostID}>
        <div className='blogger-details'>
          <div className='blog-top-left'>
            <div className={ postData.Verified ? 'blogger-img v' : 'blogger-img'}>
              <Link href={`/${postData.Username}/photo`} shallow>
                <Image 
                  src={ postData.DisplayPicture.includes('https') || postData.DisplayPicture.includes('http') ? postData.DisplayPicture : "https://s3.amazonaws.com/profile-display-images/" + postData.DisplayPicture}
                  className='pdp cursor-pointer' width={35} height={35} alt='blogger' />
              </Link>
            </div>
            <div className='blog-maker'>
              <div className='blog-maker-name'>
                <div className='name'><span>{postData.NameOfPoster}</span></div>
                {postData.Verified ? <Image src='/verified.svg' className='verified' width={20} height={20} alt='Verified tag'/> : null}
                {window.location.pathname.includes('posts') ? null : <div className='blog-username text-brand text-xs'>@{postData.Username}</div>}
              </div>
              {window.location.pathname.includes('posts') ? <div className='blog-username text-brand'>@{postData.Username}</div> : <div className='blog-time'>{time}</div>}
            </div>
          </div>
          <div className='blog-top-right'>
            <div className='pre-ellipsis' onClick={handleDropdownClick}>
              <svg height='30px' width='30px' viewBox='0 0 24 24' aria-hidden='true' className='three-dots'>
                <g><path className='pathEllip dark:fill-slate-200' d='M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z'></path></g>
              </svg>
              <span className={`ellipsis-dropdown ${isDropdownVisible ? 'show' : ''} dark:!bg-neutral-950`}>
                {postData.DisplayPicture 
                  ?
                  <p>
                  <svg height='20px' width='20px' viewBox='0 0 24 24' aria-hidden='true' className='dark:fill-slate-200'><g><path className='dark:fill-slate-200' d='M10 4c-1.105 0-2 .9-2 2s.895 2 2 2 2-.9 2-2-.895-2-2-2zM6 6c0-2.21 1.791-4 4-4s4 1.79 4 4-1.791 4-4 4-4-1.79-4-4zm13 4v3h2v-3h3V8h-3V5h-2v3h-3v2h3zM3.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.19C13.318 13.65 11.838 13 10 13s-3.317.65-4.404 1.81c-.922.98-1.608 2.39-1.945 4.19zm.486-5.56C5.627 11.85 7.648 11 10 11s4.373.85 5.863 2.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H1.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46z'></path></g></svg>
                  Follow @{postData.Username}
                  </p>
                    : 
                  ''}
                <p>
                  <svg height='20px' width='20px' viewBox='0 0 24 24' aria-hidden='true'>
                    <g><path className='dark:fill-slate-200' d='M5.5 4c-.28 0-.5.22-.5.5v15c0 .28.22.5.5.5H12v2H5.5C4.12 22 3 20.88 3 19.5v-15C3 3.12 4.12 2 5.5 2h13C19.88 2 21 3.12 21 4.5V13h-2V4.5c0-.28-.22-.5-.5-.5h-13zM16 10H8V8h8v2zm-8 2h8v2H8v-2zm10 7v-3h2v3h3v2h-3v3h-2v-3h-3v-2h3z'></path></g>
                  </svg>
                  Save post
                </p>
                <p>
                  <svg height='20px' width='20px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                    <g strokeWidth='0'></g>
                    <g strokeLinecap='round' strokeLinejoin='round'></g>
                    <g><path d='M6 11C6 8.17157 6 6.75736 6.87868 5.87868C7.75736 5 9.17157 5 12 5H15C17.8284 5 19.2426 5 20.1213 5.87868C21 6.75736 21 8.17157 21 11V16C21 18.8284 21 20.2426 20.1213 21.1213C19.2426 22 17.8284 22 15 22H12C9.17157 22 7.75736 22 6.87868 21.1213C6 20.2426 6 18.8284 6 16V11Z' stroke='#1C274C' className='svgcpy dark:stroke-slate-200' strokeWidth='1.5'></path><path className='svgcpy dark:stroke-slate-200' d='M6 19C4.34315 19 3 17.6569 3 16V10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H15C16.6569 2 18 3.34315 18 5' stroke='#1C274C' strokeWidth='1.5'></path></g>
                  </svg>
                  Copy link
                </p>
                {postData.DisplayPicture 
                  ?
                  <p>
                  <svg height='20px' width='20px' viewBox='0 0 1024 1024' className='icon' version='1.1' xmlns='http://www.w3.org/2000/svg' fill='#000000'><g strokeWidth='0'></g><g id='SVGRepo_tracerCarrier' strokeLinecap='round' strokeLinejoin='round'></g><g id='SVGRepo_iconCarrier'><path d='M154 260h568v700H154z' fill='#FF3B30'></path><path d='M624.428 261.076v485.956c0 57.379-46.737 103.894-104.391 103.894h-362.56v107.246h566.815V261.076h-99.864z' fill='#030504'></path><path d='M320.5 870.07c-8.218 0-14.5-6.664-14.5-14.883V438.474c0-8.218 6.282-14.883 14.5-14.883s14.5 6.664 14.5 14.883v416.713c0 8.219-6.282 14.883-14.5 14.883zM543.5 870.07c-8.218 0-14.5-6.664-14.5-14.883V438.474c0-8.218 6.282-14.883 14.5-14.883s14.5 6.664 14.5 14.883v416.713c0 8.219-6.282 14.883-14.5 14.883z' fill='#152B3C'></path><path d='M721.185 345.717v-84.641H164.437z' fill='#030504'></path><path d='M633.596 235.166l-228.054-71.773 31.55-99.3 228.055 71.773z' fill='#FF3B30'></path><path d='M847.401 324.783c-2.223 0-4.475-0.333-6.706-1.034L185.038 117.401c-11.765-3.703-18.298-16.239-14.592-27.996 3.706-11.766 16.241-18.288 27.993-14.595l655.656 206.346c11.766 3.703 18.298 16.239 14.592 27.996-2.995 9.531-11.795 15.631-21.286 15.631z' fill='#FF3B30'></path></g></svg> 
                  Delete Post
                </p>
                  : 
                  ''}
                <p>
                  <svg height='20px' width='20px' viewBox='0 0 24 24' aria-hidden='true'>
                    <g><path className='dark:fill-slate-200' d='M18 6.59V1.2L8.71 7H5.5C4.12 7 3 8.12 3 9.5v5C3 15.88 4.12 17 5.5 17h2.09l-2.3 2.29 1.42 1.42 15.5-15.5-1.42-1.42L18 6.59zm-8 8V8.55l6-3.75v3.79l-6 6zM5 9.5c0-.28.22-.5.5-.5H8v6H5.5c-.28 0-.5-.22-.5-.5v-5zm6.5 9.24l1.45-1.45L16 19.2V14l2 .02v8.78l-6.5-4.06z'></path></g>
                  </svg>
                  Mute @{postData.Username}
                </p>
                <p>
                  <svg height='20px' width='20px' viewBox='0 0 24 24' aria-hidden='true'>
                    <g><path className='dark:fill-slate-200' d='M12 3.75c-4.55 0-8.25 3.69-8.25 8.25 0 1.92.66 3.68 1.75 5.08L17.09 5.5C15.68 4.4 13.92 3.75 12 3.75zm6.5 3.17L6.92 18.5c1.4 1.1 3.16 1.75 5.08 1.75 4.56 0 8.25-3.69 8.25-8.25 0-1.92-.65-3.68-1.75-5.08zM1.75 12C1.75 6.34 6.34 1.75 12 1.75S22.25 6.34 22.25 12 17.66 22.25 12 22.25 1.75 17.66 1.75 12z'></path></g>
                  </svg>
                  Block @{postData.Username}
                </p>
                <p>
                  <svg height='20px' width='20px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                    <g strokeWidth='0'></g>
                    <g strokeLinecap='round' strokeLinejoin='round'></g>
                    <g><path className='dark:fill-slate-200' d='M17 12C17 11.4477 16.5523 11 16 11H8C7.44772 11 7 11.4477 7 12C7 12.5523 7.44771 13 8 13H16C16.5523 13 17 12.5523 17 12Z' fill='#000'></path><path className='dark:fill-slate-200' fillRule='evenodd' clipRule='evenodd' d='M12 23C18.0751 23 23 18.0751 23 12C23 5.92487 18.0751 1 12 1C5.92487 1 1 5.92487 1 12C1 18.0751 5.92487 23 12 23ZM12 20.9932C7.03321 20.9932 3.00683 16.9668 3.00683 12C3.00683 7.03321 7.03321 3.00683 12 3.00683C16.9668 3.00683 20.9932 7.03321 20.9932 12C20.9932 16.9668 16.9668 20.9932 12 20.9932Z' fill='#000'></path></g>
                  </svg>
                  Remove post
                </p>
                <p>
                <svg height='20px' width='20px' viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="0"></g><g strokeLinecap="round" strokeLinejoin="round"></g> <g> <path className='dark:fill-slate-200' fillRule="evenodd" clipRule="evenodd" d="M4 1C3.44772 1 3 1.44772 3 2V22C3 22.5523 3.44772 23 4 23C4.55228 23 5 22.5523 5 22V13.5983C5.46602 13.3663 6.20273 13.0429 6.99251 12.8455C8.40911 12.4914 9.54598 12.6221 10.168 13.555C11.329 15.2964 13.5462 15.4498 15.2526 15.2798C17.0533 15.1004 18.8348 14.5107 19.7354 14.1776C20.5267 13.885 21 13.1336 21 12.3408V5.72337C21 4.17197 19.3578 3.26624 18.0489 3.85981C16.9875 4.34118 15.5774 4.87875 14.3031 5.0563C12.9699 5.24207 12.1956 4.9907 11.832 4.44544C10.5201 2.47763 8.27558 2.24466 6.66694 2.37871C6.0494 2.43018 5.47559 2.53816 5 2.65249V2C5 1.44772 4.55228 1 4 1ZM5 4.72107V11.4047C5.44083 11.2247 5.95616 11.043 6.50747 10.9052C8.09087 10.5094 10.454 10.3787 11.832 12.4455C12.3106 13.1634 13.4135 13.4531 15.0543 13.2897C16.5758 13.1381 18.1422 12.6321 19 12.3172V5.72337C19 5.67794 18.9081 5.66623 18.875 5.68126C17.7575 6.18804 16.1396 6.81972 14.5791 7.03716C13.0776 7.24639 11.2104 7.1185 10.168 5.55488C9.47989 4.52284 8.2244 4.25586 6.83304 4.3718C6.12405 4.43089 5.46427 4.58626 5 4.72107Z" fill="#0F0F0F"></path> </g></svg>
                  Report post
                </p>
              </span>
            </div>
          </div>
        </div>
        <div className='blog-contents' onClick={() => handleActivePost(`${postData.Username}/posts/${postData.PostID}`)}>
          {postData.Caption && postData.Caption.length > 250 && !window.location.pathname.includes('posts') ? <><abbr title={postData.Caption}><pre className='text-xs'>{postData.Caption.substring(0, 250)}... <span className='showMore'>show more</span></pre></abbr></> : <abbr title={postData.Caption}><pre className='text-xs'>{postData.Caption}</pre></abbr>}
        </div>
        {/* {showMore} */}
        {postData?.Image.length > 0 &&
          <Swiper 
          pagination={{ clickable: checkLength(), dynamicBullets: checkLength(), }} 
          navigation={checkLength()} 
          modules={checkLength() ? [Navigation, Pagination] : []} 
          slidesPerView={1} spaceBetween={5} 
          className="!flex rounded-lg bg-neutral-600 dark:bg-neutral-950 flex-grow w-full">
          {postData.Image 
            ? postData.Image.map((media,index) => (
                  media.includes('png') || media.includes('jpg') || media.includes('jpeg') ?
                    ( <SwiperSlide className='flex flex-col items-center justify-center h-full m-auto' key={media+index} id={`${media.length}`}>
                        <ImageDiv link={`/${postData.Username}/posts/${postData.PostID}/photo/${index}`} media={media} host={!media.includes('https') && !media.startsWith('/') ? true : false}/>
                      </SwiperSlide>)
                  : ( <SwiperSlide className='flex flex-col items-center justify-center h-full m-auto' key={media+index} id={`${media.length}`}>
                        <VideoDiv link={`/${postData.Username}/posts/${postData.PostID}/photo/${index}`} media={media} host={!media.includes('https') && !media.startsWith('/') ? true : false}/>
                      </SwiperSlide>)
              )) 
            : null}
          </Swiper>
        }
        {window.location.pathname.includes('posts') ? <div className='blog-time'>{timeFormatter(postData.TimeOfPost)}</div> : null}
        <div className='reaction-panel'>
          <div className='blog-foot' id='like'>
            <svg className={isliked ? 'like-icon clicked' : 'like-icon'} width='30px' height='30px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' onClick={() => handleClick('liked')}>
              <path className='dark:stroke-slate-200 !stroke-current' d='M8.10627 18.2468C5.29819 16.0833 2 13.5422 2 9.1371C2 4.27416 7.50016 0.825464 12 5.50063L14 7.49928C14.2929 7.79212 14.7678 7.79203 15.0607 7.49908C15.3535 7.20614 15.3534 6.73127 15.0605 6.43843L13.1285 4.50712C17.3685 1.40309 22 4.67465 22 9.1371C22 13.5422 18.7018 16.0833 15.8937 18.2468C15.6019 18.4717 15.3153 18.6925 15.0383 18.9109C14 19.7294 13 20.5 12 20.5C11 20.5 10 19.7294 8.96173 18.9109C8.68471 18.6925 8.39814 18.4717 8.10627 18.2468Z' fill='#242742fd'/>
            </svg>
            <div className='likes'>{isliked ? formatNo(postData.NoOfLikes + 1) : formatNo(postData.NoOfLikes)}</div>
          </div>
          <div className='blog-foot' id='comment' onClick={() => handleActivePost(`/${postData.Username}/posts/${postData.PostID}`)}>
            <svg className='comment-icon' width='30px' height='30px' viewBox='0 -0.5 25 25' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path fillRule='evenodd' className='comment-icon-path dark:stroke-slate-200' clipRule='evenodd' d='M5.5 12C5.49988 14.613 6.95512 17.0085 9.2741 18.2127C11.5931 19.4169 14.3897 19.2292 16.527 17.726L19.5 18V12C19.5 8.13401 16.366 5 12.5 5C8.63401 5 5.5 8.13401 5.5 12Z' stroke='#242742fd' strokeWidth='1.0' strokeLinecap='round' strokeLinejoin='round'/>
              <path className='comment-icon-path1 dark:fill-slate-200' d='M9.5 13.25C9.08579 13.25 8.75 13.5858 8.75 14C8.75 14.4142 9.08579 14.75 9.5 14.75V13.25ZM13.5 14.75C13.9142 14.75 14.25 14.4142 14.25 14C14.25 13.5858 13.9142 13.25 13.5 13.25V14.75ZM9.5 10.25C9.08579 10.25 8.75 10.5858 8.75 11C8.75 11.4142 9.08579 11.75 9.5 11.75V10.25ZM15.5 11.75C15.9142 11.75 16.25 11.4142 16.25 11C16.25 10.5858 15.9142 10.25 15.5 10.25V11.75ZM9.5 14.75H13.5V13.25H9.5V14.75ZM9.5 11.75H15.5V10.25H9.5V11.75Z' fill='#242742fd'/>
            </svg>
            <div className='comments'>{formatNo(postData.NoOfComment)}</div>
          </div>
          <div className='blog-foot' id='share'>
            <svg className={isShared ? 'share-icon clicked' : 'share-icon'} width='30px' height='30px' viewBox='-0.5 0 25 25' fill='none' xmlns='http://www.w3.org/2000/svg' onClick={() => handleClick('shared')}>
              <path className='dark:stroke-slate-200' d='M13.47 4.13998C12.74 4.35998 12.28 5.96 12.09 7.91C6.77997 7.91 2 13.4802 2 20.0802C4.19 14.0802 8.99995 12.45 12.14 12.45C12.34 14.21 12.79 15.6202 13.47 15.8202C15.57 16.4302 22 12.4401 22 9.98006C22 7.52006 15.57 3.52998 13.47 4.13998Z' stroke='#242742fd' strokeWidth='1.1' strokeLinecap='round' strokeLinejoin='round'/>
              </svg>
            <div className='shares'>{isShared ? formatNo(postData.NoOfShares + 1) : formatNo(postData.NoOfShares)}</div>
          </div>
          <div className='blog-foot' id='bookmark'>
            <svg className={isBookmarked ? 'bookmark-icon clicked' : 'bookmark-icon'} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' onClick={() => handleClick('bookmarked')}>
              <path className='dark:stroke-slate-200 !stroke-current' fillRule='evenodd' clipRule='evenodd' d='M21 11.0975V16.0909C21 19.1875 21 20.7358 20.2659 21.4123C19.9158 21.735 19.4739 21.9377 19.0031 21.9915C18.016 22.1045 16.8633 21.0849 14.5578 19.0458C13.5388 18.1445 13.0292 17.6938 12.4397 17.5751C12.1494 17.5166 11.8506 17.5166 11.5603 17.5751C10.9708 17.6938 10.4612 18.1445 9.44216 19.0458C7.13673 21.0849 5.98402 22.1045 4.99692 21.9915C4.52615 21.9377 4.08421 21.735 3.73411 21.4123C3 20.7358 3 19.1875 3 16.0909V11.0975C3 6.80891 3 4.6646 4.31802 3.3323C5.63604 2 7.75736 2 12 2C16.2426 2 18.364 2 19.682 3.3323C21 4.6646 21 6.80891 21 11.0975ZM8.25 6C8.25 5.58579 8.58579 5.25 9 5.25H15C15.4142 5.25 15.75 5.58579 15.75 6C15.75 6.41421 15.4142 6.75 15 6.75H9C8.58579 6.75 8.25 6.41421 8.25 6Z' fill='#242742fd'/>
            </svg>
            <div className='bookmarks'>{isBookmarked ? formatNo(postData.NoOfBookmarks + 1) : formatNo(postData.NoOfBookmarks)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Posts;
