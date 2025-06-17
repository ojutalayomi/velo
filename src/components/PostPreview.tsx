import React, { useCallback, useEffect, useRef, useState } from 'react';
import SwiperCore from 'swiper';
import { ArrowLeft, Share, Heart, MessageCircle, Repeat2, RefreshCw, Bookmark } from 'lucide-react';
import { Comments, formatNo, Post } from '@/templates/PostProps';
import { PostSchema } from '@/lib/types/type';
import { getComments, getPost } from '../lib/getStatus';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import MediaSlide from '@/templates/mediaSlides';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { useUser } from '@/app/providers/UserProvider';
import ImageContent from '@/components/imageContent';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import { cn, generateRandomToken } from '@/lib/utils';
import PostCard from '@/components/PostCard';
import { Skeleton } from './ui/skeleton';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { useAppDispatch } from '@/redux/hooks';
import { addPost, setPostPreview, updatePost } from '@/redux/postsSlice';
import { useSocket } from '@/app/providers/SocketProvider';
import ShareButton from './ShareButton';
import { useNavigateWithHistory } from '@/hooks/useNavigateWithHistory';


interface Params {
  username?: string;
  id?: string;
  index?: string;
}

const PostPreview: React.FC = () => {
  const navigate = useNavigateWithHistory();
  const params = useParams() as Params;
  const { userdata } = useUser();
  const { username, id, index } = params;
  const dispatch = useAppDispatch();
  const socket = useSocket();
  const {message} = useSelector((state: RootState) => state.posts.postPreview)
  const { posts, loading } = useSelector((state: RootState) => state.posts);
  const post = posts.find(post => post.PostID === id) as PostSchema
  const [toFetch, setToFetch] = useState<boolean>(true)
  const indexInt = parseInt(index || '0');
  const router = useRouter();
  const [swiper, updateSwiper] = useState<SwiperCore | null>(null);
  const [currentIndex, setCurrentIndex] = useState(indexInt)
  const [reload, setReload] = useState<boolean>(false);
  const [postLoading, setPostLoading] = useState<boolean>(true);
  const [postError, setPostError] = useState<string | null>(null);
  const [currentPost, setCurrentPost] = useState<PostSchema | null>(null);
  const [replyText, setReplyText] = useState('');
  

  const fetchPost = useCallback(async () => {
    try {
      setPostLoading(true);
      const postResponse = await getPost(id!); // Fetch the post by ID
      if (postResponse.post.Type !== 'comment') dispatch(addPost(postResponse.post)); // Add the post to the Redux store
      setCurrentPost(postResponse.post); // Set the fetched post to currentPost
    } catch (error) {
      setPostError((error as Error).message);
    } finally {
      setPostLoading(false);
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (!loading) {
      if (post) {
        // If the post is already available in the Redux store, set it to currentPost
        setCurrentPost(post);
        setPostLoading(false);
      } else if (id) {
        // If the post is not available, fetch it
        fetchPost();
      }
    }
  }, [loading, post, id, fetchPost]);

  useEffect(() => {
    if (currentPost) {
      // console.log('Current post is set:', currentPost);
    }
  }, [currentPost]);

  const checkLength = useCallback(() => {
    if(currentPost?.Image) {
      return currentPost?.Image.length > 1;
    }
    return false;
  }, [currentPost?.Image])

  useEffect(() => {
    // if (toFetch) fetchData();
    if (reload) fetchPost();
  }, [reload]);

  useEffect(() => {
   
  }, [posts]);

  const onSlideChange = () => {
    if (swiper) {
      if (swiper.activeIndex !== indexInt) {
        setToFetch(false);
        router.push(`/${currentPost?.Username}/posts/${currentPost?.PostID}/photo/${swiper.activeIndex}`);
      }
    }
  };

  const handleLike = () => {
    if (!post || !id || !userdata._id) return;

    if (post.Liked) {
      dispatch(updatePost({ id: id, updates: { NoOfLikes: post.NoOfLikes - 1, Liked: false } }));
      socket?.emit('reactToPost', {
        type: "unlike",
        key: "NoOfLikes",
        value: "dec",
        postId: id
      });
    } else {
      dispatch(updatePost({ id: id, updates: { NoOfLikes: post.NoOfLikes + 1, Liked: true }}));
      socket?.emit('reactToPost', {
        type: "like",
        key: "NoOfLikes",
        value: "inc",
        postId: id
      });
    }
  };

  const handleReshare = () => {
    if (!post || !id || !userdata._id) return;
    
    if (currentPost?.Shared) {
      dispatch(updatePost({ id: id, updates: { NoOfShares: post.NoOfShares - 1, Shared: false }}));
    } else {
      dispatch(updatePost({ id: id, updates: { NoOfShares: post.NoOfShares + 1, Shared: true }}));
    }
  };

  const handleComment = () => {
    if (!post || !id || !userdata._id || !socket) return;
    
    if (replyText.trim()) {
      const Post: PostSchema = {
        _id: "",
        UserId: "",
        DisplayPicture: "",
        NameOfPoster: "",
        Verified: false,
        TimeOfPost: new Date().toISOString(),
        Visibility: 'everyone',
        Caption: replyText,
        Image: [''],
        IsFollowing: false,
        NoOfLikes: 0,
        Liked: false,
        NoOfComment: 0,
        NoOfShares: 0,
        NoOfBookmarks: 0,
        Bookmarked: false,
        Username: "",
        PostID: "",
        Code: "",
        WhoCanComment: 'everyone',
        Shared: false,
        Type: 'comment',
        ParentId: post ? post.PostID : ''
      }
      socket.emit('post', Post)
      setReplyText('');
    }
  };

  const handleBookmark = () => {
    if (!post || !id || !userdata._id) return;
    
    if (currentPost?.Bookmarked) {
      dispatch(updatePost({ id: id, updates: { NoOfBookmarks: post.NoOfBookmarks - 1, Bookmarked: false }}));
      socket?.emit('reactToPost', {
        type: "unbookmark",
        key: "NoOfBookmarks",
        value: "dec",
        postId: id
      });
    } else {
      dispatch(updatePost({ id: id, updates: { NoOfBookmarks: post.NoOfBookmarks + 1, Bookmarked: true }}));
      socket?.emit('reactToPost', {
        type: "bookmark",
        key: "NoOfBookmarks",
        value: "inc",
        postId: id
      });
    }
  };

  useEffect(() => {
    if (swiper) {
      swiper.slideTo(indexInt);
    }
  }, [indexInt, swiper]);

  useEffect(() => {
    if(!socket || !currentPost) return;
    socket.on('deletePost', ( data: { excludeUser: string, postId: string, type: string } ) => {
      if (!data.postId) return;
      if (posts.find(post => post.PostID === data.postId)) {
          setCurrentPost(prevPost => {
              if (prevPost && prevPost._id === data.postId) {
                  const update: Partial<PostSchema> = {
                      Image: [],
                      Caption: `${prevPost.Type.toUpperCase()} deleted this post.`,
                      WhoCanComment: 'none',
                  }
                  prevPost = { ...prevPost, ...update };
                  return prevPost;
              }
              return prevPost;
          })
      }
    })
    socket.on('updatePost', ( data: { excludeUserId: string, postId: string, update: Partial<PostSchema>, type: string } ) => {
        if (!data.postId) return;
        if (posts.find(post => post.PostID === data.postId)) {
            setCurrentPost(prevPost => {
                if (prevPost && prevPost._id === data.postId) {
                    prevPost = { ...prevPost, ...data.update };
                    return prevPost;
                }
                return prevPost;
            })
        }
    })
  }, [socket])

  return (
    <div className="fixed flex top-0 left-0 z-50 bg-gray-50 dark:bg-black dark:text-white h-screen w-screen">
      <div className="flex flex-1 flex-col h-full">
        {/* Top bar */}
        <div className="flex justify-between p-4">
          <ArrowLeft size={24} className='cursor-pointer' onClick={() => navigate()}/>
            <h1>{username![0].toUpperCase() + username?.slice(1)}&apos;s post</h1>
          <Share size={24} />
        </div>
        
        {/* Video content (placeholder) */}
        <div className='flex-1'>
          {postLoading 
          ?
          <div className='flex items-center justify-center w-full h-full'><div className='loader size-7 show'></div></div>
          :
          post ? 
            (<MediaSlide className='w-full h-full' postData={post || {}} />)
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
          <div className="flex justify-around items-center">
            <button className="text-gray-400 flex items-center" 
              onClick={() => {
                console.log('Open comments')
                router.push(`/${currentPost?.Username}/posts/${currentPost?.PostID}`)
              }}
            >
              <MessageCircle size={24} />
              <span className="ml-1">{formatNo(currentPost?.NoOfComment ?? 0)}</span>
            </button>
            <ShareButton post={post}>
              <span className={`text-gray-400 flex items-center ${currentPost?.Shared ? 'text-green-500' : ''}`} onClick={handleReshare}>
                <Repeat2 size={24} />
                <span className="ml-1">{formatNo(currentPost?.NoOfShares ?? 0)}</span>
              </span>
            </ShareButton>
            <button className={`flex items-center ${currentPost?.Liked ? 'text-brand' : 'text-gray-400'}`} onClick={handleLike}>
              <Heart size={24} fill={currentPost?.Liked ? 'currentColor' : 'none'} />
              <span className="ml-1">{formatNo(currentPost?.NoOfLikes ?? 0)}</span>
            </button>
            <button className={`flex items-center ${currentPost?.Bookmarked ? 'text-brand' : 'text-gray-400'}`} onClick={handleBookmark}>
              <Bookmark size={24} fill={currentPost?.Bookmarked ? 'currentColor' : 'none'}/>
              <span className="ml-1">{formatNo(currentPost?.NoOfBookmarks ?? 0)}</span>
            </button>
          </div>
        </div>

        
        {/* Reply input */}
        <ReplyTextArea className='md:hidden' replyText={replyText} setReplyText={setReplyText} handleComment={handleComment}/>
      </div>
      <LeftSideBar id={id || ''} currentPost={currentPost} replyText={replyText} setReplyText={setReplyText} handleComment={handleComment} className='flex-none w-1/2 md:w-2/5 lg:w-1/3'/>
    </div>
  );
};

export default PostPreview;

const LeftSideBar = (
  { className, currentPost, id, replyText, setReplyText, handleComment, ...props }: 
    { className?: string, currentPost: PostSchema | null, id: string, replyText: string, setReplyText: React.Dispatch<React.SetStateAction<string>>, handleComment: () => void, props?: HTMLDivElement }
) => {
  const { userdata } = useUser();
  const socket = useSocket();
  const [comments, setComments] = useState<Comments['comments']>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if(id){
      setLoading(true);
      try {
        const commentsResponse = await getComments(id);
        setComments(commentsResponse.comments);
      } catch (error) {
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if(!socket || !currentPost) return;
    socket.on('newComment', (data: { excludeUser: string, blog: PostSchema }) => {
        setComments(prevComments => {
            if (prevComments) {
              return [...prevComments, data.blog];
            }
            return [data.blog];
        })
    })
    socket.on('deletePost', ( data: { excludeUser: string, postId: string, type: string } ) => {
      // console.log(data)
        if (!data.postId) return;
        setComments(prevComments => {
          if (prevComments) {
            return prevComments.filter(comment => comment._id !== data.postId);
          }
      })
    })
    socket.on('updatePost', ( data: { excludeUserId: string, postId: string, update: Partial<PostSchema>, type: string } ) => {
      // console.log(data)
        if (!data.postId) return;
        setComments(prevComments => {
          if (prevComments) {
              const index = prevComments.findIndex(post => post.PostID === data.postId);
              if (index !== -1) {
                  prevComments[index] = { ...prevComments[index], ...data.update };
                  return prevComments;
              }
          }
          return prevComments;
      })
    })

    return () => {
      socket.off('newComment');
      // socket.off('deletePost');
      // socket.off('updatePost');
    };
  }, [socket])

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
        {currentPost
        ?
        <PostCard key={generateRandomToken(10)} showMedia={false} postData={currentPost}/>
        :
        <RenderLoadingPlaceholder/>
        }
        
        {/* Reply input */}
        <ReplyTextArea replyText={replyText} setReplyText={setReplyText} handleComment={handleComment}/>

        {/* Comments Section */}
        {(comments && !loading)
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

function ReplyTextArea ({ className, replyText, setReplyText, handleComment }: { className?: string, replyText: string, setReplyText: React.Dispatch<React.SetStateAction<string>>, handleComment: () => void }) {
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
    <div className={cn('flex items-center p-4 bg-white dark:bg-zinc-900 dark:text-white', className)}>
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