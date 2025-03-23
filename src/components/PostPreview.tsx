import React, { useCallback, useEffect, useRef, useState } from 'react';
import SwiperCore from 'swiper';
import { ArrowLeft, Share, Heart, MessageCircle, Repeat2, RefreshCw } from 'lucide-react';
import { Comments, formatNo, Post, PostData } from '@/templates/PostProps';
import { getComments, getPost } from './getStatus';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import MediaSlide from '@/templates/mediaSlides';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import ImageContent from '@/components/imageContent';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import { cn, generateRandomToken } from '@/lib/utils';
import PostCard from '@/templates/posts';
import { Skeleton } from './ui/skeleton';


interface Params {
  username?: string;
  id?: string;
  index?: string;
}

const PostPreview: React.FC = () => {
  const params = useParams() as Params;
  const { username, id, index } = params;
  const [toFetch, setToFetch] = useState<boolean>(true)
  const indexInt = parseInt(index || '0');
  const router = useRouter();
  const [swiper, updateSwiper] = useState<SwiperCore | null>(null);
  const [currentIndex, setCurrentIndex] = useState(indexInt)
  const [reload, setReload] = useState<boolean>(false);
  const [postLoading, setpostLoading] = useState<boolean>(true);
  const [postError, setpostError] = useState<string | null>(null);
  const [postSuccess, setpostSuccess] = useState<PostData | null>(null);
  const [likes, setLikes] = useState(formatNo(postSuccess?.NoOfLikes || 0));
  const [isLiked, setIsLiked] = useState(false);
  const [retweets, setRetweets] = useState(formatNo(postSuccess?.NoOfShares || 0));
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [comments, setComments] = useState(formatNo(postSuccess?.NoOfComment || 0));
  const [replyText, setReplyText] = useState('');
  const [success1, setSuccess1] = useState<Comments>();
  const [loading1, setLoading1] = useState<boolean>(true);
  const [error1, setError1] = useState<string | null>(null);
  

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
      fetchData1();
    }
  }, [id])

  const fetchData1 = useCallback(async () => {
    setLoading1(true);
    if(id){
      try {
        const commentsResponse = await getComments(id);
        setSuccess1(commentsResponse);
      } catch (error) {
        setError1((error as Error).message);
      } finally {
        setLoading1(false);
      }
    }
  }, [id]);

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
    <div className="fixed flex top-0 left-0 z-50 bg-gray-50 dark:bg-black dark:text-white h-screen w-screen">
      <div className="flex flex-1 flex-col h-full">
        {/* Top bar */}
        <div className="flex justify-between p-4">
          <ArrowLeft size={24} className='cursor-pointer' onClick={() => router.back()}/>
          <Share size={24} />
        </div>
        
        {/* Video content (placeholder) */}
        <div className='flex-1'>
          {postLoading 
          ?
          <div className='flex items-center justify-center w-full h-full'><div className='loader size-7 show'></div></div>
          :
          postSuccess ? 
            (<MediaSlide className='w-full h-full' postData={postSuccess} />)
          :
          postError && 
            <div className='flex flex-col items-center justify-center w-full h-full'>
              <RefreshCw className='cursor-pointer' size={30} onClick={() => setReload(true)}/><h1>Reload</h1>
            </div>
          }
        </div>
        
        {/* Controls */}
        <div className="p-4">
          {/* Action buttons */}
          <div className="flex justify-between items-center">
            <button className="text-gray-400 flex items-center" 
              onClick={() => {
                console.log('Open comments')
                router.push(`/${postSuccess?.Username}/posts/${postSuccess?.PostID}`)
              }}
            >
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
        <ReplyTextArea replyText={replyText} setReplyText={setReplyText} handleComment={handleComment}/>
      </div>
      <LeftSideBar post={postSuccess!} comments={success1?.comments || []} replyText={replyText} setReplyText={setReplyText} handleComment={handleComment} className='flex-none w-1/3'/>
    </div>
  );
};

export default PostPreview;

const LeftSideBar = (
  { className, post, comments, replyText, setReplyText, handleComment, ...props }: 
  { className?: string, post: PostData, comments: PostData[], replyText: string, setReplyText: React.Dispatch<React.SetStateAction<string>>, handleComment: () => void, props?: HTMLDivElement }
) => {
  const { userdata } = useUser();
  const [commentsNo, setCommentsNo] = useState(formatNo(post?.NoOfComment || 0));

  return (
    <div className={cn('min-h-screen hidden md:block flex-1 dark:bg-zinc-900 dark:text-slate-200 bg-gray-50', className)} {...props}>
      <div className="max-h-full mx-auto overflow-auto space-y-2">
        {/* Search Bar */}
        <div className="dark:bg-zinc-900 bg-gray-50 px-4 py-2 w-full">
          <div className='relative'>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search people"
              className="w-full bg-white dark:bg-zinc-800 border-0 shadow-sm rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {/* Post Section */}
        {post 
        ?
        <PostCard key={generateRandomToken(10)} showMedia={false} postData={post}/>
        :
        <RenderLoadingPlaceholder/>
        }
        
        {/* Reply input */}
        <ReplyTextArea replyText={replyText} setReplyText={setReplyText} handleComment={handleComment}/>

        {/* Comments Section */}
        {comments
        ?
        comments.map(comment => <PostCard key={generateRandomToken(10)} postData={comment}/>)
        :
        <div className='flex items-center justify-center w-full h-full'><div className='loader size-7 show'></div></div>
        }

        {/* User Profile */}
        <div className="mx-4">
          <ImageContent userdata={userdata}/>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

function ReplyTextArea ({ replyText, setReplyText, handleComment }: { replyText: string, setReplyText: React.Dispatch<React.SetStateAction<string>>, handleComment: () => void }) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [txtButton, setTxtButton] = useState(false);

  useEffect(() => {
    const handleInput = () => {
        const textArea = textAreaRef.current;
        if (textArea) {
            textArea.style.height = '38px';
            textArea.style.height = `${textArea.scrollHeight}px`;
            if(textArea.innerHTML !== '') setTxtButton(true)
            else setTxtButton(false)
        }
    };

    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.addEventListener('input', handleInput);
      return () => {
          textArea.removeEventListener('input', handleInput);
      };
    }
  }, []);

  return (
    <div className="p-4 border-t border-gray-700 flex">
      <textarea
        ref={textAreaRef} 
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Send your reply" 
        className="flex-grow max-h-[100px] text-sm focus:border-b focus:border-brand resize-none bg-transparent border-none focus:outline-none dark:text-white mr-2"
      />
      <Button 
        onClick={handleComment}
        className="bg-brand text-white text-sm px-2 py-1 rounded-full disabled:opacity-50"
        disabled={!replyText.trim()}
      >
        Reply
      </Button>
    </div>
  )
}

function RenderLoadingPlaceholder() {
  return (
    <div className="flex flex-col space-y-3 cursor-progress m-4 rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-md">
      <div className='flex items-center justify-start gap-2'>
        <Skeleton className="size-10 rounded-full" />
        <div className='flex flex-col space-y-2'>
          <Skeleton className="h-3 w-16 rounded-xl" />
          <Skeleton className="h-3 w-12 rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-8 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-3 w-24 rounded-xl" />
      <div className="flex items-center justify-around gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i++} className="size-8" />
        ))}
      </div>
    </div>
  )
}