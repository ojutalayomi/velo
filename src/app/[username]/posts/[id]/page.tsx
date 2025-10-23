"use client";
import { ArrowLeft, Loader2, Send, Share, SmileIcon, Upload } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import PostCard from "@/components/PostCard";
import RightSideBar from "@/components/RightSideBar";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import { getComments, getPost } from "@/lib/getStatus";
import { PostSchema } from "@/lib/types/type";
import { RootState } from "@/redux/store";
import { Comments, Post } from "@/templates/PostProps";

const PostContent: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const socket = useSocket();
  const { userdata, loading: userdataLoading, error: userdataError, refetchUser } = useUser();
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
  const { posts, loading: postsLoading } = useSelector((state: RootState) => state.posts);
  const post_ = posts.find((post) => post.PostID === params?.id) as PostSchema;
  const [post, setPost] = useState<Post["post"]>();
  const [postMessage, setPostMessage] = useState<Post["message"]>();
  const [comments, setComments] = useState<Comments["comments"]>();
  const [commentsMessage, setCommentsMessage] = useState<Comments["message"]>();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [textAreaStyle, setTextAreaStyle] = useState<string>("rounded-full");
  const [isTextAreaFocused, setIsTextAreaFocused] = useState<boolean>(false);

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
      setLoading((l) => {
        return {
          post: l.post,
          comment: true,
        };
      });
      if (params && params.id) {
        try {
          const commentsResponse = await getComments(params.id);
          setComments(commentsResponse.comments);
          setCommentsMessage(commentsResponse.message);
        } catch (error) {
          setErrorMessage((e) => {
            return {
              comment: (error as Error).message,
              post: e.post,
            };
          });
        } finally {
          setLoading((l) => {
            return {
              post: l.post,
              comment: false,
            };
          });
        }
      }
    };

    fetchData();
  }, [params, params?.id]);

  useEffect(() => {
    const handleInput = () => {
      const textArea = textAreaRef.current;
      if (textArea) {
        textArea.style.height = "34px";
        textArea.style.height = `${textArea.scrollHeight}px`;
      }
      if (textArea && textArea.value) {
        setTextAreaStyle("rounded-xl");
        setIsTextAreaFocused(true);
      } else {
        setTextAreaStyle("rounded-full");
        setIsTextAreaFocused(false);
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

  useEffect(() => {
    if (!socket || !post) return;
    socket.on("newComment", (data: { excludeUser: string; blog: PostSchema }) => {
      setComments((prevComments) => {
        if (prevComments) {
          return [...prevComments, data.blog];
        }
        return [data.blog];
      });
    });
    socket.on("deletePost", (data: { excludeUser: string; postId: string; type: string }) => {
      if (!data.postId) return;
      if (post?.PostID === data.postId) {
        setPost((prevPost) => {
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
      } else {
        setComments((prevComments) => {
          if (prevComments) {
            return prevComments.filter((comment) => comment._id !== data.postId);
          }
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
        if (post?.PostID === data.postId) {
          setPost((prevPost) => {
            if (prevPost && prevPost._id === data.postId) {
              prevPost = { ...prevPost, ...data.update };
              return prevPost;
            }
            return prevPost;
          });
        } else {
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
      }
    );

    return () => {
      socket.off("newComment");
      // socket.off('deletePost');
      // socket.off('updatePost');
    };
  }, [post, socket]);

  return (
    <div className="flex h-screen max-h-screen w-full overflow-auto dark:bg-black">
      <div className="flex size-full flex-col md:w-3/5">
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
        <div id="postpage" className="dark:text-slate-200">
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

          <div className="commentSection">
            {!errorMessage.comment ? <div className="commentHeader">Comments</div> : null}
            {loading.comment ? (
              <div className="flex h-[90%] w-full items-center justify-center">
                <Loader2 className="loader" size={30} />
              </div>
            ) : comments && comments.length > 0 ? (
              comments.map((comment) => <PostCard key={comment._id} postData={comment} />)
            ) : (
              <div className="noComments">No comments yet.</div>
            )}
            {errorMessage.comment && (
              <div className="flex h-[90%] w-full items-center justify-center">
                <div className="text-2xl">{errorMessage.comment}</div>
              </div>
            )}
          </div>
        </div>
        {(!errorMessage.post || commentsMessage === "Disable Comment.") && (
          <div className="sticky bottom-0 w-full border-t border-gray-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-black">
            <div className="mx-auto flex max-w-3xl items-center gap-2">
              <Image
                src={userdata.displayPicture || "/velo11.png"}
                className={`rounded-full object-cover ${isTextAreaFocused ? "hidden" : ""}`}
                width={32}
                height={32}
                alt="User avatar"
              />
              <div className={`relative flex flex-1 ${textAreaStyle} overflow-hidden`}>
                <textarea
                  className={`max-h-28 min-h-[34px] flex-1 resize-none bg-gray-100 py-2 pl-3 pr-[70px] text-sm outline-none placeholder:text-gray-500 dark:bg-zinc-900 dark:placeholder:text-gray-400`}
                  ref={textAreaRef}
                  placeholder="Write a comment..."
                  rows={1}
                />
                <div
                  className={`absolute right-3 ${isTextAreaFocused ? "bottom-0" : "top-1/2"} flex -translate-y-1/2 transform items-center gap-2 text-gray-400`}
                >
                  <EmojiPicker
                    onChange={(emoji: string) =>
                      textAreaRef.current && (textAreaRef.current.value += emoji)
                    }
                  >
                    <SmileIcon className="size-4 cursor-pointer text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200" />
                  </EmojiPicker>
                  <Upload className="size-4 cursor-pointer text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200" />
                  <Send className="size-4 cursor-pointer text-brand hover:text-brand/80" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <RightSideBar />
    </div>
  );
};
export default PostContent;
