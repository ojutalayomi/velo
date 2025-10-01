"use client";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Comments, Post } from "@/templates/PostProps";
import { PostSchema } from "@/lib/types/type";
import PostCard from "@/components/PostCard";
import { useEffect, useRef, useState } from "react";
import { getComments, getPost } from "@/lib/getStatus";
import { useUser } from "@/app/providers/UserProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Send, Share, SmileIcon, Upload } from "lucide-react";
import LeftSideBar from "@/components/LeftSideBar";
import { useSocket } from "@/app/providers/SocketProvider";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import { EmojiPicker } from "@/components/ui/emoji-picker";

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
      const available_post = posts.find((post) => post.PostID === params?.id) as PostSchema;
      if (available_post) {
        // If the post is already available in the Redux store, set it to currentPost
        setPost(available_post);
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
  }, [postsLoading, posts, params?.id]);

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
  }, [socket]);

  return (
    <div className="w-full flex h-screen max-h-screen dark:bg-black overflow-auto">
      <div className="md:w-3/5 flex flex-col h-full w-full">
        <div className="flex justify-between p-1 sticky top-0 z-10 bg-white dark:bg-zinc-900 shadow-md">
          <div className="flex items-center m-2 w-full justify-between gap-2">
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
            <div className="flex flex-col w-full space-y-3 cursor-progress mt-4 rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-md">
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
              <div className="flex items-center justify-center w-full h-[90%]">
                <div className="text-2xl">{errorMessage.post}</div>
              </div>
            )
          )}

          <div className="commentSection">
            {!errorMessage.comment ? <div className="commentHeader">Comments</div> : null}
            {loading.comment ? (
              <div className="flex items-center justify-center w-full h-[90%]">
                <Loader2 className="loader" size={30} />
              </div>
            ) : comments && comments.length > 0 ? (
              comments.map((comment) => <PostCard key={comment._id} postData={comment} />)
            ) : (
              <div className="noComments">No comments yet.</div>
            )}
            {errorMessage.comment && (
              <div className="flex items-center justify-center w-full h-[90%]">
                <div className="text-2xl">{errorMessage.comment}</div>
              </div>
            )}
          </div>
        </div>
        {(!errorMessage.post || commentsMessage === "Disable Comment.") && (
          <div className="sticky bottom-0 w-full bg-white dark:bg-black border-t border-gray-200 dark:border-zinc-800 py-2 px-3">
            <div className="flex items-center gap-2 max-w-3xl mx-auto">
              <Image
                src={userdata.displayPicture || "/velo11.png"}
                className={`rounded-full object-cover ${isTextAreaFocused ? "hidden" : ""}`}
                width={32}
                height={32}
                alt="User avatar"
              />
              <div className={`relative flex flex-1 ${textAreaStyle} overflow-hidden`}>
                <textarea
                  className={`flex-1 bg-gray-100 dark:bg-zinc-900 min-h-[34px] max-h-28 py-2 pl-3 pr-[70px] resize-none outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm`}
                  ref={textAreaRef}
                  placeholder="Write a comment..."
                  rows={1}
                />
                <div
                  className={`absolute right-3 ${isTextAreaFocused ? "bottom-0" : "top-1/2"} transform -translate-y-1/2 text-gray-400 flex items-center gap-2`}
                >
                  <EmojiPicker
                    onChange={(emoji: string) =>
                      textAreaRef.current && (textAreaRef.current.value += emoji)
                    }
                  >
                    <SmileIcon className="size-4 text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" />
                  </EmojiPicker>
                  <Upload className="size-4 text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" />
                  <Send className="size-4 text-brand cursor-pointer hover:text-brand/80" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <LeftSideBar />
    </div>
  );
};
export default PostContent;
