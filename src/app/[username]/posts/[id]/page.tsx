"use client";
import { ArrowLeft, Loader2, Share } from "lucide-react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import CommentComposer from "@/components/CommentComposer";
import PostAnalytics from "@/components/PostAnalytics";
import PostCard from "@/components/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import type { PaginationMeta } from "@/lib/apiPagination";
import { fetchCommentsPage, getPost } from "@/lib/getStatus";
import { PostSchema } from "@/lib/types/type";
import { RootState } from "@/redux/store";
import { Comments, Post } from "@/templates/PostProps";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";


const PostContent: React.FC = () => {
  const params = useParams();
  const socket = useSocket();
  const { userdata } = useUser();
  const navigate = useNavigateWithHistory();
  const [errorMessage, setErrorMessage] = useState<{
    post: string | null;
    comment: string | null;
  }>({
    post: null,
    comment: null,
  });
  const [loading, setLoading] = useState<{
    post: boolean;
    comment: boolean;
  }>({
    post: true,
    comment: true,
  });
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { posts, loading: postsLoading } = useSelector((state: RootState) => state.posts);
  const [post, setPost] = useState<Post["post"]>();
  const [postMessage, setPostMessage] = useState<Post["message"]>();
  const [comments, setComments] = useState<Comments["comments"]>();
  const [commentsMessage, setCommentsMessage] = useState<Comments["message"]>();
  const [commentsPagination, setCommentsPagination] = useState<PaginationMeta | null>(null);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);

  // Pull-down-to-reveal parent post (only for comments)
  const scrollRef = useRef<HTMLDivElement>(null);
  const mainPostRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const wheelAcc = useRef(0);
  const [parentPost, setParentPost] = useState<PostSchema | null>(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState<string | null>(null);
  const [pull, setPull] = useState(0);
  const PULL_THRESHOLD = 70;
  const isComment = post?.Type === "comment" && !!post.ParentId;

  const revealParent = useCallback(async () => {
    if (!post?.ParentId || parentPost || parentLoading) return;
    setParentLoading(true);
    setParentError(null);
    try {
      const res = await getPost(post.ParentId);
      setParentPost(res.post as PostSchema);
    } catch (error) {
      setParentError((error as Error).message);
    } finally {
      setParentLoading(false);
    }
  }, [post?.ParentId, parentPost, parentLoading]);

  // Reset when navigating to a different post
  useEffect(() => {
    setParentPost(null);
    setParentError(null);
    setPull(0);
  }, [params?.id]);

  // Keep the main post in view once the parent is inserted above it
  useLayoutEffect(() => {
    if (parentPost) mainPostRef.current?.scrollIntoView({ block: "start" });
  }, [parentPost]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isComment || parentPost) return;
    touchStartY.current = scrollRef.current?.scrollTop === 0 ? e.touches[0].clientY : null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    setPull(dy > 0 ? Math.min(dy * 0.5, PULL_THRESHOLD * 1.5) : 0);
  };
  const onTouchEnd = () => {
    if (touchStartY.current === null) return;
    touchStartY.current = null;
    if (pull >= PULL_THRESHOLD) void revealParent();
    setPull(0);
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!isComment || parentPost || scrollRef.current?.scrollTop !== 0) return;
    if (e.deltaY < 0) {
      wheelAcc.current += -e.deltaY;
      if (wheelAcc.current > 150) {
        wheelAcc.current = 0;
        void revealParent();
      }
    } else {
      wheelAcc.current = 0;
    }
  };

  const fetchPost = async (id: string) => {
    setLoading((l) => {
      return {
        post: true,
        comment: l.comment,
      };
    });
    try {
      const postsResponse = await getPost(id);
      setPost(postsResponse.post);
      setPostMessage(postsResponse.message);
    } catch (error) {
      setErrorMessage((e) => {
        return {
          post: (error as Error).message,
          comment: e.comment,
        };
      });
    } finally {
      setLoading((l) => {
        return {
          post: false,
          comment: l.comment,
        };
      });
    }
  };

  useEffect(() => {
    if (!postsLoading && params && params.id) {
      const availablePost = posts.find((post) => post.PostID === params?.id) as PostSchema;
      if (availablePost) {
        // If the post is already available in the Redux store, set it to currentPost
        setPost(availablePost);
        setLoading((l) => {
          return {
            post: false,
            comment: l.comment,
          };
        });
      } else {
        // If the post is not available, fetch it
        fetchPost(params.id as string);
      }
    }
  }, [postsLoading, posts, params?.id, params]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading((l) => ({
        post: l.post,
        comment: true,
      }));
      if (!params?.id) return;
      try {
        const commentsResponse = await fetchCommentsPage(params.id as string, 0);
        setComments(commentsResponse.data);
        setCommentsMessage(commentsResponse.message);
        setCommentsPagination(commentsResponse.pagination);
      } catch (error) {
        setErrorMessage((e) => ({
          comment: (error as Error).message,
          post: e.post,
        }));
      } finally {
        setLoading((l) => ({
          post: l.post,
          comment: false,
        }));
      }
    };

    fetchData();
  }, [params?.id]);

  const commentKey = useCallback((c: PostSchema) => String(c.PostID ?? c._id), []);

  const loadMoreComments = useCallback(async () => {
    if (!params?.id || !commentsPagination?.hasMore || commentsLoadingMore) return;
    setCommentsLoadingMore(true);
    try {
      const nextSkip = commentsPagination.skip + commentsPagination.limit;
      const page = await fetchCommentsPage(params.id as string, nextSkip);
      setComments((prev) => {
        const base = prev ?? [];
        const seen = new Set(base.map(commentKey));
        const extras = page.data.filter((c) => !seen.has(commentKey(c)));
        return [...base, ...extras];
      });
      setCommentsPagination(page.pagination);
    } finally {
      setCommentsLoadingMore(false);
    }
  }, [commentsLoadingMore, commentsPagination, params?.id, commentKey]);

  useEffect(() => {
    if (!socket || !post) return;

    const onNewComment = (data: { excludeUser: string; blog: PostSchema }) => {
      if (data.blog.ParentId !== post.PostID) return;
      setComments((prevComments) => {
        if (prevComments?.some((c) => c.PostID === data.blog.PostID)) return prevComments;
        return prevComments ? [data.blog, ...prevComments] : [data.blog];
      });
    };

    const onDeletePost = (data: { excludeUser: string; postId: string; type: string }) => {
      if (!data.postId) return;
      if (post.PostID === data.postId) {
        setPost((prevPost) =>
          prevPost && prevPost._id === data.postId
            ? {
                ...prevPost,
                Image: [],
                Caption: `${prevPost.Type.toUpperCase()} deleted this post.`,
                WhoCanComment: "none",
              }
            : prevPost
        );
      } else {
        setComments((prevComments) =>
          prevComments ? prevComments.filter((comment) => comment._id !== data.postId) : prevComments
        );
      }
    };

    const onUpdatePost = (data: {
      excludeUserId: string;
      postId: string;
      update: Partial<PostSchema>;
      type: string;
    }) => {
      if (!data.postId) return;
      if (post.PostID === data.postId) {
        setPost((prevPost) =>
          prevPost && prevPost._id === data.postId ? { ...prevPost, ...data.update } : prevPost
        );
      } else {
        // Return a new array so React sees the change (no in-place mutation).
        setComments((prevComments) =>
          prevComments
            ? prevComments.map((c) => (c.PostID === data.postId ? { ...c, ...data.update } : c))
            : prevComments
        );
      }
    };

    socket.on("newComment", onNewComment);
    socket.on("deletePost", onDeletePost);
    socket.on("updatePost", onUpdatePost);

    return () => {
      // Remove only this page's handlers, not every listener on the shared socket.
      socket.off("newComment", onNewComment);
      socket.off("deletePost", onDeletePost);
      socket.off("updatePost", onUpdatePost);
    };
  }, [post, socket]);

  return (
    <>
      {params?.id && <PostAnalytics postId={params.id as string} userId={userdata._id} />}
      <div
        ref={scrollRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
        className="flex size-full h-screen max-h-screen w-full flex-col overflow-auto"
      >
        <div className="sticky top-0 z-10 flex justify-between bg-white p-1 shadow-md dark:bg-zinc-900">
          <div className="m-2 flex w-full items-center justify-between gap-2">
            <ArrowLeft size={24} className="cursor-pointer" onClick={() => navigate()} />
            <h1>
              {post?.Username
                ? post.Username[0].toUpperCase() + post.Username.slice(1) + "'s post"
                : ""}
            </h1>
            <Share size={24} />
          </div>
        </div>
        <div className="flex-1 dark:text-slate-200">
          {isComment && !parentPost && (
            <div
              className="flex items-center justify-center overflow-hidden text-sm text-gray-500 transition-[height] dark:text-slate-400"
              style={{ height: parentLoading ? 40 : pull }}
            >
              {parentLoading ? (
                <Loader2 className="loader" size={20} />
              ) : parentError ? (
                parentError
              ) : pull >= PULL_THRESHOLD ? (
                "Release to view parent post"
              ) : pull > 0 ? (
                "Pull down to view parent post"
              ) : null}
            </div>
          )}
          {parentPost && (
            <div className="border-l-2 border-gray-300 dark:border-zinc-700">
              <PostCard key={parentPost._id} postData={parentPost} />
            </div>
          )}
          <div ref={mainPostRef}>
          {loading.post ? (
            <div className="mt-4 flex w-full cursor-progress flex-col space-y-3 rounded-xl bg-white p-4 shadow-md dark:bg-zinc-900">
              <div className="flex items-center justify-start gap-2">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex flex-col space-y-2">
                  <Skeleton className="h-4 w-16 rounded-xl" />
                  <Skeleton className="h-4 w-12 rounded-xl" />
                </div>
              </div>
              <Skeleton className="h-8 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-4 w-16 rounded-xl" />
              <div className="flex items-center justify-around gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i++} className="size-8" />
                ))}
              </div>
            </div>
          ) : post ? (
            <PostCard key={post._id} postData={post} />
          ) : (
            errorMessage.post && (
              <div className="flex h-[90%] w-full items-center justify-center">
                <div className="text-2xl">{errorMessage.post}</div>
              </div>
            )
          )}
          </div>

          <div>
            {!errorMessage.comment ? 
            <div className="flex items-center justify-between border-gray-200 bg-gray-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900 dark:text-slate-200">
              <SelectComponent />
              <Link
              href={pathname+'/shares'}
              >
                View quotes &gt;
              </Link>
            </div> : null}
            {loading.comment ? (
              <div className="flex h-[90%] w-full items-center justify-center">
                <Loader2 className="loader" size={30} />
              </div>
            ) : comments && comments.length > 0 ? (
              <>
                {comments.map((comment) => (
                  <PostCard key={comment._id} postData={comment} />
                ))}
                {commentsPagination?.hasMore ? (
                  <div className="flex justify-center py-4">
                    <button
                      type="button"
                      disabled={commentsLoadingMore}
                      onClick={() => void loadMoreComments()}
                      className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                    >
                      {commentsLoadingMore ? "Loading…" : "Load older comments"}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-center">No comments yet.</div>
            )}
            {errorMessage.comment && (
              <div className="flex h-[90%] w-full items-center justify-center">
                <div className="text-2xl">{errorMessage.comment}</div>
              </div>
            )}
          </div>
        </div>
        {(!errorMessage.post || !userdata._id || commentsMessage === "Disable Comment.") && (
          <footer className="sticky bottom-0 w-full border-t border-gray-200 bg-gray-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900 dark:text-slate-200">
            <CommentComposer
              variant="bar"
              className="mx-auto max-w-3xl"
              parent={post}
              onRequireSignIn={() => {
                const currParams = new URLSearchParams(searchParams?.toString() || "");
                currParams.set("composeComment", "true");
                currParams.set("postId", post?.PostID || "");
                currParams.set("postType", "comment");
                router.push(`${pathname}?${currParams.toString()}`, { scroll: false });
              }}
            />
          </footer>
        )}
      </div>
    </>
  );
};
export default PostContent;

function SelectComponent() {
  const items = [
    { label: "Recent", value: "Most recent" },
    { label: "Relevant", value: "Most relevant" },
    { label: "Liked", value: "Most liked" }
  ]
  return (
    <Select value={items[0].value}>
      <SelectTrigger className="w-full max-w-48 rounded-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Sort comments</SelectLabel>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}