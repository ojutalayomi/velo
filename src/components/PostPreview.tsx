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
import { cn, generateRandomToken } from "@/lib/utils";
import { useAppDispatch } from "@/redux/hooks";
import { addPost, updatePost } from "@/redux/postsSlice";
import { RootState } from "@/redux/store";
import MediaSlides from "@/templates/mediaSlides";
import { Comments, formatNo } from "@/templates/PostProps";

import PostAnalytics from "./PostAnalytics";
import ShareButton from "./ShareButton";
import { fetchCommentsPage, getPost } from "../lib/getStatus";
import { Skeleton } from "./ui/skeleton";






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
  const replyDraftRef = useRef("");
  const replyDraftPostIdRef = useRef(id);
  
  if (replyDraftPostIdRef.current !== id) {
    replyDraftRef.current = "";
    replyDraftPostIdRef.current = id;
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

  useEffect(() => {
    if (!socket || !currentPost) return;
    socket.on("deletePost", (data: { excludeUser: string; postId: string; type: string }) => {
      if (!data.postId) return;
      if (posts.find((post) => post.PostID === data.postId)) {
        setCurrentPost((prevPost) => {
          if (prevPost && prevPost._id === data.postId) {
            const update: Partial<PostSchema> = {
              Image: [],
              Caption: `${prevPost.Type.toUpperCase()} deleted this post.`,
              WhoCanComment: "none",
            };
            prevPost = { ...prevPost, ...update };
            return prevPost;
          }
          return prevPost;
        });
      }
    });
    socket.on(
      "updatePost",
      (data: {
        excludeUserId: string;
        postId: string;
        update: Partial<PostSchema>;
        type: string;
      }) => {
        if (!data.postId) return;
        if (posts.find((post) => post.PostID === data.postId)) {
          setCurrentPost((prevPost) => {
            if (prevPost && prevPost._id === data.postId) {
              prevPost = { ...prevPost, ...data.update };
              return prevPost;
            }
            return prevPost;
          });
        }
      }
    );
  }, [socket]);

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
          draftRef={replyDraftRef}
          postId={id ?? ""}
          placement="mobile"
          handleComment={handleComment}
        />
      </div>
      <RightSideBar
        id={id || ""}
        currentPost={currentPost}
        draftRef={replyDraftRef}
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
  draftRef,
  handleComment,
  ...props
}: {
  className?: string;
  currentPost: PostSchema | null;
  id: string;
  draftRef: React.RefObject<string>;
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

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const commentsResponse = await fetchCommentsPage(id, 0);
      setComments(commentsResponse.data);
      setCommentsPagination(commentsResponse.pagination);
    } catch (err) {
      setError((err as Error).message);
      toast.error(error)
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

  fetchData();

  useEffect(() => {
    if (!socket || !currentPost) return;
    socket.on("newComment", (data: { excludeUser: string; blog: PostSchema }) => {
      setComments((prevComments) => {
        if (prevComments) {
          return [data.blog, ...prevComments];
        }
        return [data.blog];
      });
    });
    socket.on("deletePost", (data: { excludeUser: string; postId: string; type: string }) => {
      // console.log(data)
      if (!data.postId) return;
      setComments((prevComments) => {
        if (prevComments) {
          return prevComments.filter((comment) => comment._id !== data.postId);
        }
      });
    });
    socket.on(
      "updatePost",
      (data: {
        excludeUserId: string;
        postId: string;
        update: Partial<PostSchema>;
        type: string;
      }) => {
        // console.log(data)
        if (!data.postId) return;
        setComments((prevComments) => {
          if (prevComments) {
            const index = prevComments.findIndex((post) => post.PostID === data.postId);
            if (index !== -1) {
              prevComments[index] = { ...prevComments[index], ...data.update };
              return prevComments;
            }
          }
          return prevComments;
        });
      }
    );

    return () => {
      socket.off("newComment");
      // socket.off('deletePost');
      // socket.off('updatePost');
    };
  }, [socket]);

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
        <div className="w-full bg-gray-50 px-4 py-2 dark:bg-zinc-900">
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
        </div>

        {/* Post Section */}
        {currentPost ? (
          <PostCard key={generateRandomToken(10)} showMedia={false} postData={currentPost} />
        ) : (
          <RenderLoadingPlaceholder />
        )}

        {/* Reply input */}
        <ReplyTextArea
          draftRef={draftRef}
          postId={id}
          placement="sidebar"
          handleComment={handleComment}
        />

        {/* Comments Section */}
        {comments && !loading ? (
          <>
            {comments.map((comment) => (
              <PostCard key={generateRandomToken(10)} postData={comment} />
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

function ReplyTextArea({
  className,
  draftRef,
  postId,
  placement,
  handleComment,
}: {
  className?: string;
  draftRef: React.RefObject<string>;
  postId: string;
  placement: "mobile" | "sidebar";
  handleComment: (caption: string) => boolean;
}) {
  const [replyText, setReplyText] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [txtButton, setTxtButton] = useState(false);

  useEffect(() => {
    setReplyText(draftRef.current);
  }, [postId, draftRef]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const syncFromRef = () => {
      const desktop = mq.matches;
      const active = placement === "sidebar" ? desktop : !desktop;
      if (active) setReplyText(draftRef.current);
    };
    syncFromRef();
    mq.addEventListener("change", syncFromRef);
    return () => mq.removeEventListener("change", syncFromRef);
  }, [placement, draftRef]);

  useEffect(() => {
    const handleInput = () => {
      const textArea = textAreaRef.current;
      if (textArea) {
        textArea.style.height = "38px";
        textArea.style.height = `${textArea.scrollHeight}px`;
        if (textArea.innerHTML !== "") setTxtButton(true);
        else setTxtButton(false);
      }
    };

    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.addEventListener("input", handleInput);
      return () => {
        textArea.removeEventListener("input", handleInput);
      };
    }
  }, []);

  return (
    <div
      className={cn("flex items-center p-4 bg-white dark:bg-zinc-900 dark:text-white", className)}
    >
      <textarea
        ref={textAreaRef}
        value={replyText}
        onChange={(e) => {
          const v = e.target.value;
          draftRef.current = v;
          setReplyText(v);
        }}
        placeholder="Send your reply"
        className="mr-2 max-h-[100px] flex-grow resize-none border-none bg-transparent text-sm focus:border-b focus:border-brand focus:outline-none dark:text-white"
      />
      <Button
        onClick={() => {
          if (handleComment(replyText)) {
            draftRef.current = "";
            setReplyText("");
          }
        }}
        className="rounded-full bg-brand px-2 py-1 text-sm text-white disabled:opacity-50"
        disabled={!replyText.trim()}
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
