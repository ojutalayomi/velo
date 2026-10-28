import { ArrowLeft, Share, Heart, MessageCircle, Repeat2, RefreshCw, Search, Bookmark } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import SwiperCore from "swiper";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { Footer } from "@/components/Footer";
import ImageContent from "@/components/imageContent";
import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import type { PaginationMeta } from "@/lib/apiPagination";
import { PostSchema } from "@/lib/types/type";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/redux/hooks";
import { addPost, updatePost } from "@/redux/postsSlice";
import { RootState } from "@/redux/store";
import MediaSlides from "@/templates/mediaSlides";
import { Comments, formatNo } from "@/templates/PostProps";

import PostAnalytics from "./PostAnalytics";
import ShareButton from "./ShareButton";
import { fetchCommentsPage, getPost } from "../lib/getStatus";
import { Skeleton } from "./ui/skeleton";
import { TextAreaBox } from "@ojutalayomi/react-textarea-enhanced";






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
  const { posts, loading } = useSelector((state: RootState) => state.posts);
  const post = posts.find((post) => post.PostID === id) as PostSchema;
  const [toFetch, setToFetch] = useState<boolean>(true);
  const indexInt = parseInt(index || "0");
  const router = useRouter();
  const [swiper, updateSwiper] = useState<SwiperCore | null>(null);
  const [currentIndex, setCurrentIndex] = useState(indexInt);
  const [reload, setReload] = useState<boolean>(false);
  const [postLoading, setPostLoading] = useState<boolean>(true);
  const [postError, setPostError] = useState<string | null>(null);
  const [currentPost, setCurrentPost] = useState<PostSchema | null>(null);
  // Single source of truth for the reply text, shared by the mobile and sidebar inputs.
  const [replyText, setReplyText] = useState("");
  const [replyPostId, setReplyPostId] = useState(id);
  
  // Navigating to a different post clears the draft (adjusting state during render, no ref needed).
  if (replyPostId !== id) {
    setReplyPostId(id);
    setReplyText("");
  }

  const fetchPost = useCallback(async () => {
    try {
      setPostLoading(true);
      const postResponse = await getPost(id!); // Fetch the post by ID
      if (postResponse.post.Type !== "comment") dispatch(addPost(postResponse.post)); // Add the post to the Redux store
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
    if (currentPost?.Image) {
      return currentPost?.Image.length > 1;
    }
    return false;
  }, [currentPost?.Image]);

  useEffect(() => {
    // if (toFetch) fetchData();
    if (reload) fetchPost();
  }, [reload]);

  useEffect(() => {}, [posts]);

  const onSlideChange = () => {
    if (swiper) {
      if (swiper.activeIndex !== indexInt) {
        setToFetch(false);
        router.replace(
          `/${currentPost?.Username}/posts/${currentPost?.PostID}/photo/${swiper.activeIndex}`
        );
      }
    }
  };

  const handleLike = () => {
    if (!post || !id || !userdata._id) return;

    if (post.Liked) {
      dispatch(updatePost({ id, updates: { NoOfLikes: post.NoOfLikes - 1, Liked: false } }));
      socket?.emit("reactToPost", {
        type: "unlike",
        key: "NoOfLikes",
        value: "dec",
        postId: id,
      });
    } else {
      dispatch(updatePost({ id, updates: { NoOfLikes: post.NoOfLikes + 1, Liked: true } }));
      socket?.emit("reactToPost", {
        type: "like",
        key: "NoOfLikes",
        value: "inc",
        postId: id,
      });
    }
  };

  const handleReshare = () => {
    if (!post || !id || !userdata._id) return;

    if (currentPost?.Shared) {
      dispatch(updatePost({ id, updates: { NoOfShares: post.NoOfShares - 1, Shared: false } }));
    } else {
      dispatch(updatePost({ id, updates: { NoOfShares: post.NoOfShares + 1, Shared: true } }));
    }
  };

  const handleComment = useCallback(
    (caption: string): boolean => {
      if (!post || !id || !userdata._id || !socket) return false;
      if (!caption.trim()) return false;

      const Post: PostSchema = {
        _id: "",
        UserId: "",
        DisplayPicture: "",
        NameOfPoster: "",
        Verified: false,
        TimeOfPost: new Date().toISOString(),
        Visibility: "everyone",
        Caption: caption,
        Image: [""],
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
        WhoCanComment: "everyone",
        Shared: false,
        Type: "comment",
        ParentId: post ? post.PostID : "",
      };
      socket.emit("post", Post);
      return true;
    },
    [post, id, userdata._id, socket]
  );

  const handleBookmark = () => {
    if (!post || !id || !userdata._id) return;

    if (currentPost?.Bookmarked) {
      dispatch(
        updatePost({
          id,
          updates: { NoOfBookmarks: post.NoOfBookmarks - 1, Bookmarked: false },
        })
      );
      socket?.emit("reactToPost", {
        type: "unbookmark",
        key: "NoOfBookmarks",
        value: "dec",
        postId: id,
      });
    } else {
      dispatch(
        updatePost({ id, updates: { NoOfBookmarks: post.NoOfBookmarks + 1, Bookmarked: true } })
      );
      socket?.emit("reactToPost", {
        type: "bookmark",
        key: "NoOfBookmarks",
        value: "inc",
        postId: id,
      });
    }
  };

  useEffect(() => {
    if (swiper) {
      swiper.slideTo(indexInt);
    }
  }, [indexInt, swiper]);

  const hasCurrentPost = !!currentPost;

  useEffect(() => {
    if (!socket || !hasCurrentPost) return;

    const onDeletePost = (data: { excludeUser: string; postId: string; type: string }) => {
      if (!data.postId) return;
      if (!posts.some((p) => p.PostID === data.postId)) return;
      setCurrentPost((prev) =>
        prev && prev._id === data.postId
          ? {
              ...prev,
              Image: [],
              Caption: `${prev.Type.toUpperCase()} deleted this post.`,
              WhoCanComment: "none",
            }
          : prev
      );
    };

    const onUpdatePost = (data: {
      excludeUserId: string;
      postId: string;
      update: Partial<PostSchema>;
      type: string;
    }) => {
      if (!data.postId) return;
      if (!posts.some((p) => p.PostID === data.postId)) return;
      setCurrentPost((prev) =>
        prev && prev._id === data.postId ? { ...prev, ...data.update } : prev
      );
    };

    socket.on("deletePost", onDeletePost);
    socket.on("updatePost", onUpdatePost);

    return () => {
      socket.off("deletePost", onDeletePost);
      socket.off("updatePost", onUpdatePost);
    };
  }, [socket, hasCurrentPost, posts]);

  return (
    <div className="fixed left-0 top-0 z-50 flex h-screen w-screen bg-gray-50 dark:bg-black dark:text-white">
      {params?.id && <PostAnalytics postId={params.id as string} userId={userdata._id} />}
      <div className="flex h-full flex-1 flex-col">
        {/* Top bar */}
        <div className="flex justify-between p-4">
          <ArrowLeft size={24} className="cursor-pointer" onClick={() => navigate()} />
          <h1>{username![0].toUpperCase() + username?.slice(1)}&apos;s post</h1>
          <Share size={24} />
        </div>

        {/* Video content (placeholder) */}
        <div className="flex-1">
          {postLoading ? (
            <div className="flex size-full items-center justify-center">
              <div className="loader show size-7" />
            </div>
          ) : post ? (
            <MediaSlides className="size-full" postData={post || {}} />
          ) : (
            postError && (
              <div className="flex size-full flex-col items-center justify-center">
                <RefreshCw className="cursor-pointer" size={30} onClick={() => setReload(true)} />
                <h1>Reload</h1>
              </div>
            )
          )}
        </div>

        {/* Controls */}
        <div className="p-4 md:hidden">
          {/* Action buttons */}
          <div className="flex items-center justify-around">
            <button
              className="flex items-center text-gray-400"
              onClick={() => {
                // console.log('Open comments')
                router.push(`/${currentPost?.Username}/posts/${currentPost?.PostID}`);
              }}
            >
              <MessageCircle size={24} />
              <span className="ml-1">{formatNo(currentPost?.NoOfComment ?? 0)}</span>
            </button>
            <ShareButton post={post}>
              <span
                className={`flex items-center text-gray-400 ${currentPost?.Shared ? "text-green-500" : ""}`}
                onClick={handleReshare}
              >
                <Repeat2 size={24} />
                <span className="ml-1">{formatNo(currentPost?.NoOfShares ?? 0)}</span>
              </span>
            </ShareButton>
            <button
              className={`flex items-center ${currentPost?.Liked ? "text-brand" : "text-gray-400"}`}
              onClick={handleLike}
            >
              <Heart size={24} fill={currentPost?.Liked ? "currentColor" : "none"} />
              <span className="ml-1">{formatNo(currentPost?.NoOfLikes ?? 0)}</span>
            </button>
            <button
              className={`flex items-center ${currentPost?.Bookmarked ? "text-brand" : "text-gray-400"}`}
              onClick={handleBookmark}
            >
              <Bookmark size={24} fill={currentPost?.Bookmarked ? "currentColor" : "none"} />
              <span className="ml-1">{formatNo(currentPost?.NoOfBookmarks ?? 0)}</span>
            </button>
          </div>
        </div>

        {/* Reply input */}
        <ReplyTextArea
          className="md:hidden"
          value={replyText}
          onChange={setReplyText}
          handleComment={handleComment}
        />
      </div>
      <RightSideBar
        id={id || ""}
        currentPost={currentPost}
        replyText={replyText}
        onReplyTextChange={setReplyText}
        handleComment={handleComment}
        className="w-1/2 flex-none md:w-2/5 lg:w-1/3"
      />
    </div>
  );
};

export default PostPreview;

const RightSideBar = ({
  className,
  currentPost,
  id,
  replyText,
  onReplyTextChange,
  handleComment,
  ...props
}: {
  className?: string;
  currentPost: PostSchema | null;
  id: string;
  replyText: string;
  onReplyTextChange: (value: string) => void;
  handleComment: (caption: string) => boolean;
  props?: HTMLDivElement;
}) => {
  const { userdata } = useUser();
  const socket = useSocket();
  const [comments, setComments] = useState<Comments["comments"]>();
  const [commentsPagination, setCommentsPagination] = useState<PaginationMeta | null>(null);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Track mount status to prevent updates on unmounted components
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      if (!isMountedRef.current) return;
      const commentsResponse = await fetchCommentsPage(id, 0);
      setComments(commentsResponse.data);
      setCommentsPagination(commentsResponse.pagination);
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const commentKeyInner = useCallback((c: PostSchema) => String(c.PostID ?? c._id), []);

  const loadMoreCommentsSidebar = useCallback(async () => {
    if (!id || !commentsPagination?.hasMore || commentsLoadingMore) return;
    setCommentsLoadingMore(true);
    try {
      const nextSkip = commentsPagination.skip + commentsPagination.limit;
      const page = await fetchCommentsPage(id, nextSkip);
      setComments((prev) => {
        const base = prev ?? [];
        const seen = new Set(base.map(commentKeyInner));
        const extras = page.data.filter((c) => !seen.has(commentKeyInner(c)));
        return [...base, ...extras];
      });
      setCommentsPagination(page.pagination);
    } finally {
      setCommentsLoadingMore(false);
    }
  }, [id, commentsLoadingMore, commentsPagination, commentKeyInner]);

  useEffect(() => {
    fetchData();
  }, [])

  const hasCurrentPost = !!currentPost;

  useEffect(() => {
    if (!socket || !hasCurrentPost) return;

    const onNewComment = (data: { excludeUser: string; blog: PostSchema }) => {
      setComments((prev) => (prev ? [data.blog, ...prev] : [data.blog]));
    };

    const onDeletePost = (data: { excludeUser: string; postId: string; type: string }) => {
      if (!data.postId) return;
      setComments((prev) => (prev ? prev.filter((c) => c._id !== data.postId) : prev));
    };

    const onUpdatePost = (data: {
      excludeUserId: string;
      postId: string;
      update: Partial<PostSchema>;
      type: string;
    }) => {
      if (!data.postId) return;
      // Build a new array/object so React sees the change.
      setComments((prev) =>
        prev ? prev.map((c) => (c.PostID === data.postId ? { ...c, ...data.update } : c)) : prev
      );
    };

    socket.on("newComment", onNewComment);
    socket.on("deletePost", onDeletePost);
    socket.on("updatePost", onUpdatePost);

    return () => {
      socket.off("newComment", onNewComment);
      socket.off("deletePost", onDeletePost);
      socket.off("updatePost", onUpdatePost);
    };
  }, [socket, hasCurrentPost]);

  return (
    <div
      className={cn(
        "min-h-screen hidden md:block flex-1 dark:bg-zinc-900 dark:text-slate-200 bg-gray-50",
        className
      )}
      {...props}
    >
      <div className="mx-auto max-h-full space-y-2 overflow-auto">
        {/* Search Bar */}
        {/* <div className="w-full bg-gray-50 px-4 py-2 dark:bg-zinc-900">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
              size={18}
            />
            <Input
              type="text"
              placeholder="Search people"
              className="w-full rounded-xl border-0 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:ring-2 focus:ring-brand/20 dark:bg-zinc-800"
            />
          </div>
        </div> */}

        {/* Post Section */}
        {currentPost ? (
          <PostCard key={commentKeyInner(currentPost)} showMedia={false} postData={currentPost} />
        ) : (
          <RenderLoadingPlaceholder />
        )}

        {/* Reply input */}
        <ReplyTextArea
          value={replyText}
          onChange={onReplyTextChange}
          handleComment={handleComment}
        />

        {/* Comments Section */}
        {comments && !loading ? (
          <>
            {comments.map((comment) => (
              <PostCard key={commentKeyInner(comment)} postData={comment} />
            ))}
            {commentsPagination?.hasMore ? (
              <div className="flex justify-center py-3">
                <button
                  type="button"
                  disabled={commentsLoadingMore}
                  onClick={() => loadMoreCommentsSidebar()}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-xs dark:border-zinc-600"
                >
                  {commentsLoadingMore ? "Loading…" : "Load older comments"}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex size-full items-center justify-center">
            <div className="loader show size-7" />
          </div>
        )}

        {/* User Profile */}
        <div className="mx-4">
          <ImageContent userdata={userdata} />
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

/**
 * Controlled reply box. Both the mobile and sidebar instances are always mounted
 * (one is hidden by CSS) and receive the same `value`, so they never drift apart.
 */
function ReplyTextArea({
  className,
  value,
  onChange,
  handleComment,
}: {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  handleComment: (caption: string) => boolean;
}) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow whenever the shared value changes, and again when a hidden copy
  // becomes visible (a display:none textarea measures 0 until it is shown).
  useEffect(() => {
    const el = textAreaRef.current;
    if (!el) return;

    const resize = () => {
      el.style.height = "38px";
      el.style.height = `${Math.max(38, el.scrollHeight)}px`;
    };
    resize();

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resize);
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <div
      className={cn("flex flex-col gap-2 items-end p-4 bg-white dark:bg-zinc-900 dark:text-white", className)}
    >
      <TextAreaBox
        ref={textAreaRef}
        charLimit={250}
        maxHeight={300}
        value={value}
        onChange={(e) => onChange(e)}
        placeholder="Send your reply"
        highlightColor="#ff6257"
        className="max-h-[100px] w-full flex-grow resize-none border-none bg-transparent p-2 text-sm focus:border-b focus:border-brand focus:outline-none dark:text-white"
      />
      <Button
        onClick={() => {
          if (handleComment(value)) onChange("");
        }}
        className="rounded-full bg-brand px-2 py-1 text-sm text-white disabled:opacity-50"
        disabled={!value.trim()}
      >
        Reply
      </Button>
    </div>
  );
}

function RenderLoadingPlaceholder() {
  return (
    <div className="m-4 flex cursor-progress flex-col space-y-3 rounded-xl bg-white p-4 shadow-md dark:bg-zinc-900">
      <div className="flex items-center justify-start gap-2">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col space-y-2">
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
  );
}