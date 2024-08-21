import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Metadata } from 'next'
import SwiperCore from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { X, Share, Heart, MessageCircle, Repeat2, RefreshCw } from 'lucide-react';
import { formatNo, Post, PostData } from '@/templates/PostProps';
import { getPost } from './getStatus';
import VideoDiv from '@/templates/videoDiv';
import { useRouter } from 'next/navigation';
import ImageDiv from './imageDiv';
import { useParams } from 'next/navigation';
import { SwiperModule } from 'swiper/types';

interface Params {
  username?: string;
  id?: string;
  index?: string;
}

const PostPreview: React.FC = () => {
  const params = useParams() as Params;
  const { username, id, index } = params;
  const [toFetch,setToFetch] = useState<boolean>(true)
  const indexInt = parseInt(index || '0');
  const router = useRouter();
  const [swiper, updateSwiper] = useState<SwiperCore | null>(null);
  const [currentIndex, setCurrentIndex] = useState(indexInt)
  const [reload,setReload] = useState<boolean>(false);
  const [postLoading, setpostLoading] = useState<boolean>(true);
  const [postError, setpostError] = useState<string | null>(null);
  const [postSuccess, setpostSuccess] = useState<PostData | null>(null);
  const [likes, setLikes] = useState(formatNo(postSuccess?.NoOfLikes || 0));
  const [isLiked, setIsLiked] = useState(false);
  const [retweets, setRetweets] = useState(formatNo(postSuccess?.NoOfShares || 0));
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [comments, setComments] = useState(formatNo(postSuccess?.NoOfComment || 0));
  const [replyText, setReplyText] = useState('');

  const fetchData = useCallback(async () => {
      setpostLoading(true);

      try {
          if(id) {
            const postResponse = await getPost(id);
            setpostSuccess(postResponse.post);
          }
      } catch (error) {
          setpostError((error as Error).message);
      } finally {
          setpostLoading(false);
      }
  }, [id])

  const checkLength = useCallback(() => {
    if(postSuccess?.Image) {
      return postSuccess?.Image.length > 1;
    }
    return false;
  }, [postSuccess?.Image])

  useEffect(() => {

      if (toFetch) fetchData();
      if (reload) fetchData();
  }, [params, id, reload, fetchData, toFetch]);

  const onSlideChange = () => {
    if (swiper) {
      if (swiper.activeIndex !== indexInt) {
        setToFetch(false);
        router.push(`/${postSuccess?.Username}/posts/${postSuccess?.PostID}/photo/${swiper.activeIndex}`);
      }
    }
  };

  const handleLike = () => {
    if (isLiked) {
      setLikes(`${parseInt(likes) - 1}`);
      setIsLiked(false);
    } else {
      setLikes(`${parseInt(likes) + 1}`);
      setIsLiked(true);
    }
  };

  const handleRetweet = () => {
    if (isRetweeted) {
      setRetweets(`${parseInt(retweets) - 1}`);
      setIsRetweeted(false);
    } else {
      setRetweets(`${parseInt(retweets) + 1}`);
      setIsRetweeted(true);
    }
  };

  const handleComment = () => {
    if (replyText.trim()) {
      setComments(`${parseInt(comments) + 1}`);
      setReplyText('');
      // Here you would typically send the comment to a backend
      console.log('New comment:', replyText);
    }
  };

  const handleShare = () => {
    // Implement share functionality
    console.log('Share button clicked');
  };

  useEffect(() => {
    if (swiper) {
      swiper.slideTo(indexInt);
    }
  }, [indexInt, swiper]);


  return (
    <div className="fixed  top-0 left-0 z-50 bg-black text-white h-screen w-screen flex flex-col">
      {/* Top bar */}
      <div className="flex justify-between p-4">
        <X size={24} className='cursor-pointer' onClick={() => router.back()}/>
        <Share size={24} />
      </div>
      
      {/* Video content (placeholder) */}
      <>
          {postLoading ?<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '90%'}}><div style={{height: '30px', width: '30px'}} className='loader show'></div></div>
              :
              postSuccess ? (
                <Swiper 
                onSwiper={updateSwiper} onSlideChange={onSlideChange} 
                pagination={{ clickable: checkLength(), dynamicBullets: checkLength(), }} navigation={checkLength()} 
                modules={checkLength() ? [Navigation, Pagination] : []} 
                slidesPerView={1} spaceBetween={5} 
                className="!flex rounded-lg bg-neutral-950 border-2 border-black dark:bg-neutral-950 flex-grow w-full t29jez">
                {postSuccess 
                  ? postSuccess?.Image.map((media,index) => (
                        media.includes('png') || media.includes('jpg') || media.includes('jpeg') ?
                          ( <SwiperSlide className='!flex flex-col items-center justify-center h-full m-auto' key={media+index} id={`${media.length}`}>
                              <ImageDiv media={media} host={!media.includes('https') && !media.startsWith('/') ? true : false}/>
                            </SwiperSlide>)
                        : ( <SwiperSlide className='!flex flex-col items-center justify-center h-full m-auto' key={media+index} id={`${media.length}`}>
                              <VideoDiv media={media} host={!media.includes('https') && !media.startsWith('/') ? true : false}/>
                            </SwiperSlide>)
                    )) 
                  : null}
                </Swiper>)
              :
              postError && <div className='flex flex-col items-center justify-center w-full h-3/4'>
                  <RefreshCw className='cursor-pointer' size={30} onClick={() => setReload(true)}/><h1>Reload</h1></div>
          }
      </>
      
      {/* Controls */}
      <div className="p-4">
        {/* Action buttons */}
         <div className="flex justify-between items-center">
          <button className="text-gray-400 flex items-center" 
            onClick={() => {
              console.log('Open comments')
              router.push(`/${postSuccess?.Username}/posts/${postSuccess?.PostID}`)
              }}>
            <MessageCircle size={24} />
            <span className="ml-1">{comments}</span>
          </button>
          <button className={`text-gray-400 flex items-center ${isRetweeted ? 'text-green-500' : ''}`} onClick={handleRetweet}>
            <Repeat2 size={24} />
            <span className="ml-1">{retweets}</span>
          </button>
          <button className={`flex items-center ${isLiked ? 'text-brand' : 'text-gray-400'}`} onClick={handleLike}>
            <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
            <span className="ml-1">{likes}</span>
          </button>
          <button className="text-gray-400" onClick={handleShare}>
            <Share size={24} />
          </button>
        </div>
      </div>

      
      {/* Reply input */}
      <div className="p-4 border-t border-gray-700 flex">
        <input 
          type="text" 
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Send your reply" 
          className="flex-grow bg-transparent border-none focus:outline-none text-white mr-2"
        />
        <button 
          onClick={handleComment}
          className="bg-brand text-white px-4 py-2 rounded-full disabled:opacity-50"
          disabled={!replyText.trim()}
        >
          Reply
        </button>
      </div>
    </div>
  );
};

export default PostPreview;