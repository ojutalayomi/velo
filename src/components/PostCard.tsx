/* eslint-disable camelcase */
 
"use client";
import {
  Bookmark,
  Copy,
  Delete,
  Ellipsis,
  Flag,
  Heart,
  MessageCircle,
  MessageCircleX,
  Minus,
  Repeat2,
  Save,
  Share,
  ShieldX,
  UserRoundMinus,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { renderTextWithLinks } from "@/components/RenderTextWithLinks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Statuser } from "@/components/VerificationComponent";
import { submitFollowUpdate } from "@/lib/followApi";
import { getPost } from "@/lib/getStatus";
import { togglePostBookmark, togglePostLike } from "@/lib/postSocialActions";
import { PostSchema } from "@/lib/types/type";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/redux/hooks";
import { deletePost, updatePost } from "@/redux/postsSlice";
import { RootState } from "@/redux/store";

import PostMaker from "./PostMaker";
import ShareButton from "./ShareButton";
import { Skeleton } from "./ui/skeleton";
import { Post, formatNo, timeFormatter, updateLiveTime } from "../templates/PostProps";
import ThreadsSlide from "../templates/ThreadSlides";

type PostComponentProps = {
  postData: Post["post"];
  showMedia?: boolean;
};

interface Option {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
  destructive?: boolean;
}

type DeletePostEvent = {
  excludeUser?: string;
  postId: string;
  type?: string;
};

type UpdatePostEvent = {
  excludeUserId?: string;
  postId: string;
  update: Partial<PostSchema>;
  type?: string;
};

const isPostMatch = (post: Partial<PostSchema> | null | undefined, postId: string) =>
  post?._id === postId || post?.PostID === postId;

const actionBase =
  "group flex select-none items-center gap-1 rounded-full text-muted-foreground outline-none duration-150 ease-out-expo motion-reduce:transition-colors motion-safe:transition-[color,transform] motion-safe:active:scale-[0.94]";
const actionIconWrap =
  "-m-1.5 grid place-items-center rounded-full p-1.5 transition-colors duration-150 ease-out-expo";
const actionCount = "min-w-4 text-xs tabular-nums";

const PostCard = ({ postData, showMedia = true }: PostComponentProps) => {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const socket = useSocket();
  const { userdata } = useUser();
  const posts = useSelector((state: RootState) => state.posts.posts);
  const [originalPost, setOriginalPost] = useState<PostSchema | null>(null);
  const [isPostMakerModalOpen, setPostMakerModalOpen] = useState(false);
  const [postType, setPostType] = useState("blog");
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("");
  const [time1, setTime1] = useState("");
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isCaptionCopied, setIsCaptionCopied] = useState(false);
  const router = useRouter();
  const [data, setData] = useState<PostSchema>({} as PostSchema);
  const [containsPost, setContainsPost] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setContainsPost(window.location.pathname.includes("posts"));
    }, 100);
  }, []);

  useEffect(() => {
    (async () => {
      if (postData) {
        setPostType(postData.Type);
        if (postData.Type === "repost") {
          const original_post = posts.find(
            (post: PostSchema) => post.PostID === postData.OriginalPostId
          );
          if (original_post) {
            setData(posts.find((post: PostSchema) => post.PostID === postData.OriginalPostId)!);
            if (original_post.OriginalPostId) {
              const original_post_1 = posts.find(
                (post: PostSchema) => post.PostID === original_post.OriginalPostId
              );
              if (original_post_1)
                setOriginalPost(
                  posts.find((post: PostSchema) => post.PostID === original_post.OriginalPostId)!
                );
              else {
                const postsResponse = await getPost(original_post.OriginalPostId);
                setOriginalPost(postsResponse.post);
              }
            }
          }
        } else if (postData.Type === "quote") {
          const original_post = posts.find(
            (post: PostSchema) => post.PostID === postData.OriginalPostId
          );
          if (original_post) setOriginalPost(original_post);
          else {
            const postsResponse = await getPost(postData.OriginalPostId);
            setOriginalPost(postsResponse.post);
          }
          setData(postData);
        } else {
          setData(postData);
        }
      }
    })();
  }, [postData]);

  useEffect(() => {
    if (!socket) return;

    const handleDeletePost = (event: DeletePostEvent) => {
      const deletesPassedPost = isPostMatch(postData, event.postId);
      const deletesRenderedPost = isPostMatch(data, event.postId);
      const deletesOriginalPost = isPostMatch(originalPost, event.postId);

      if (deletesOriginalPost) {
        setOriginalPost(null);
      }

      if (deletesPassedPost || deletesRenderedPost || deletesOriginalPost) {
        dispatch(deletePost(event.postId));
      }
    };

    const handleUpdatePost = (event: UpdatePostEvent) => {
      const updatesRenderedPost = isPostMatch(data, event.postId);
      const updatesOriginalPost = isPostMatch(originalPost, event.postId);
      const updatesPassedPost = isPostMatch(postData, event.postId);

      setData((prev) => {
        if (!isPostMatch(prev, event.postId)) return prev;
        return { ...prev, ...event.update };
      });

      setOriginalPost((prev) => {
        if (!prev || !isPostMatch(prev, event.postId)) return prev;
        return { ...prev, ...event.update };
      });

      if (updatesRenderedPost || updatesOriginalPost || updatesPassedPost) {
        dispatch(updatePost({ id: event.postId, updates: event.update }));
      }
    };

    socket.on("deletePost", handleDeletePost);
    socket.on("updatePost", handleUpdatePost);

    return () => {
      socket.off("deletePost", handleDeletePost);
      socket.off("updatePost", handleUpdatePost);
    };
  }, [data, dispatch, originalPost, postData, socket]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(updateLiveTime("getlivetime", data.TimeOfPost));
    }, 1000);
    return () => clearInterval(interval); // This is important to clear the interval when the component unmounts
  }, [data.TimeOfPost]);

  useEffect(() => {
    if (!originalPost) return;

    const interval = setInterval(() => {
      setTime1(updateLiveTime("getlivetime", originalPost.TimeOfPost));
    }, 1000);
    return () => clearInterval(interval); // This is important to clear the interval when the component unmounts
  }, [originalPost, originalPost?.TimeOfPost]);

  const handleActivePost = (route: string) => {
    const id = route.split("/").at(-1);
    if (id) {
      router.push(route);
    }
  };

  const handleClick = (clicked: string) => {
    if (!userdata._id) {
      router.push("/accounts/login");
      return;
    }

    if (clicked === "liked") {
      const { next, emit } = togglePostLike(data);
      setData(next);
      dispatch(
        updatePost({ id: data.PostID, updates: { NoOfLikes: next.NoOfLikes, Liked: next.Liked } })
      );
      socket?.emit("reactToPost", emit);
      return;
    }

    if (clicked === "bookmarked") {
      const { next, emit } = togglePostBookmark(data);
      setData(next);
      dispatch(
        updatePost({
          id: data.PostID,
          updates: { NoOfBookmarks: next.NoOfBookmarks, Bookmarked: next.Bookmarked },
        })
      );
      socket?.emit("reactToPost", emit);
    }
  };

  const handleFollow = async (follow: boolean) => {
    try {
      const res = await submitFollowUpdate({
        followerId: String(userdata._id),
        followedId: String(data.UserId),
        follow,
      });
      if (res.ok) {
        setData((prev) => ({ ...prev, IsFollowing: follow }));
        dispatch(updatePost({ id: data.PostID, updates: { IsFollowing: follow } }));
      }
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "Failed to follow user",
      });
    }
  };

  const handleShowMore = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFullCaption(!showFullCaption);
  };

  const options: Option[] = [
    ...(userdata._id && data.UserId !== userdata._id
      ? [
          {
            icon: data.IsFollowing ? <UserRoundMinus size={18} /> : <UserRoundPlus size={18} />,
            text: data.IsFollowing ? `Unfollow @${data.Username}` : `Follow @${data.Username}`,
            onClick: () => {
              handleFollow(!data.IsFollowing);
            },
          },
        ]
      : []),
    {
      icon: <Save size={18} />,
      text: "Save post",
      onClick: () => handleClick("bookmarked"),
    },
    {
      icon: <Share size={18} />,
      text: "Share post via…",
      onClick: async () => {
        if (navigator.share) {
          navigator.share({
            url: `${window.location.origin}/${data.Username}/posts/${data.PostID}`,
          });
        } else {
          try {
            await navigator.clipboard.writeText(
              `${window.location.protocol}//${window.location.host}/${data.Username}/posts/${data.PostID}`
            );
            toast("Post link copied!");
          } catch (err) {
            console.error("Failed to copy post link to clipboard: ", err);
          }
        }
      },
    },
    {
      icon: <Copy size={18} />,
      text: isLinkCopied ? "Copied" : "Copy link",
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(
            `${window.location.protocol}//${window.location.host}/${data.Username}/posts/${data.PostID}`
          );
          setIsLinkCopied(true);
          setTimeout(() => setIsLinkCopied(false), 3000);
        } catch (err) {
          console.error("Failed to copy post link to clipboard: ", err);
        }
      },
    },
    {
      icon: <Copy size={18} />,
      text: isCaptionCopied ? "Copied" : "Copy caption",
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(data.Caption);
          setIsCaptionCopied(true);
          setTimeout(() => setIsCaptionCopied(false), 3000);
        } catch (err) {
          console.error("Failed to copy post caption to clipboard: ", err);
        }
      },
    },
    ...(userdata._id && data.UserId === userdata._id
      ? [
          {
            icon: <Delete size={18} />,
            text: "Delete Post",
            destructive: true,
            onClick: () => {
              socket?.emit("deletePost", {
                postId: data.PostID,
                type: data.Type,
                parentId: data.ParentId,
              });
            },
          },
        ]
      : []),
    ...(userdata._id && data.UserId !== userdata._id
      ? [
          {
            icon: <MessageCircleX size={18} />,
            text: `Mute @${data.Username}`,
            onClick: () => {},
          },
          {
            icon: <ShieldX size={18} />,
            text: `Block @${data.Username}`,
            onClick: () => {},
          },
          {
            icon: <Flag size={18} />,
            text: "Report post",
            onClick: () => {},
          },
        ]
      : []),
    {
      icon: <Minus size={18} />,
      text: "Remove post",
      onClick: () => {
        dispatch(deletePost(data.PostID));
        toast("Post Removed.");
      },
    },
  ];

  if (!data.PostID) return <RenderLoadingPlaceholder />;

  const isCaptionTruncated =
    Boolean(data.Caption) && data.Caption.length > 250 && !containsPost && !showFullCaption;

  return (
    <article
      id={data.PostID.slice(0, -4)}
      data-id={data.PostID}
      className={cn(
        "w-full bg-white text-foreground dark:bg-zinc-900",
        containsPost ? "border border-border/70" : "border-b border-border/70"
      )}
    >
      <div className={cn(containsPost ? "p-4 sm:p-5" : "px-4 py-3 sm:px-5")}>
        {postType === "repost" && (
          <div className="mb-1.5 flex items-center gap-2 text-[13px] text-muted-foreground">
            <Repeat2 className="size-[15px] shrink-0 text-brand" />
            <span className="truncate">
              Reposted by{" "}
              <Link
                href={`/${postData?.Username}`}
                className="font-semibold text-foreground underline-offset-2 hover:underline"
              >
                {postData?.Username}
              </Link>
            </span>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Link href={`/${data.Username}/photo`} shallow className="mt-0.5 block shrink-0">
            <Avatar className="size-10">
              <AvatarFallback>{data.NameOfPoster.slice(0, 2)}</AvatarFallback>
              <AvatarImage className="cursor-pointer" alt="blogger" src={data.DisplayPicture} />
            </Avatar>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1">
              <Link
                href={`/${data.Username}`}
                className="truncate text-[15px] font-semibold leading-tight underline-offset-2 hover:underline"
              >
                {data.NameOfPoster}
              </Link>
              {data.Verified ? <Statuser className="size-4 shrink-0" /> : null}
            </div>
            <div className="truncate text-sm text-muted-foreground">
              @{data.Username}
              {!containsPost && <span> · {time}</span>}
            </div>
          </div>

          <Options options={options} open={open} setOpen={setOpen} />
        </div>

        <div
          className="mt-1 cursor-pointer"
          onClick={() => handleActivePost(`/${data.Username}/posts/${data.PostID}`)}
        >
          {data.Caption ? (
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
              {isCaptionTruncated ? (
                <>
                  {renderTextWithLinks(data.Caption.substring(0, 250))}
                  <span className="text-muted-foreground">... </span>
                  <button
                    type="button"
                    onClick={handleShowMore}
                    className="font-medium text-brand underline-offset-2 hover:underline"
                  >
                    show more
                  </button>
                </>
              ) : (
                renderTextWithLinks(data.Caption)
              )}
            </p>
          ) : null}
        </div>

        {data?.Image.length > 0 && showMedia && (
          <ThreadsSlide postData={data} className="mt-3" isLink />
        )}

        {originalPost && (
          <QuotedPostCard
            handleActivePost={handleActivePost}
            originalPost={originalPost}
            time1={time1}
          />
        )}

        {containsPost ? (
          <div className="mt-3 border-t border-border/70 pt-2 text-sm text-muted-foreground">
            <div>{timeFormatter(data.TimeOfPost).replaceAll(":", " : ")}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/70 pb-2">
              <span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatNo(data.NoOfLikes)}
                </span>{" "}
                {data.NoOfLikes === 1 ? "Like" : "Likes"}
              </span>
              <span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatNo(data.NoOfComment)}
                </span>{" "}
                {data.NoOfComment === 1 ? "Comment" : "Comments"}
              </span>
              <Link
                href={`/${data.Username}/posts/${data.PostID}/shares?tab=reposts`}
                className="underline-offset-2 hover:underline"
              >
                <span className="font-semibold tabular-nums text-foreground">
                  {formatNo(data.NoOfShares)}
                </span>{" "}
                {data.NoOfShares === 1 ? "Share" : "Shares"}
              </Link>
              <span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatNo(data.NoOfBookmarks)}
                </span>{" "}
                {data.NoOfBookmarks === 1 ? "Bookmark" : "Bookmarks"}
              </span>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            aria-label={data.Liked ? "Unlike post" : "Like post"}
            aria-pressed={data.Liked}
            onClick={() => handleClick("liked")}
            className={cn(actionBase, "hover:text-brand", data.Liked && "text-brand")}
          >
            <span className={cn(actionIconWrap, "group-hover:bg-brand/10")}>
              <Heart className={cn("size-[19px]", data.Liked && "fill-brand text-brand")} />
            </span>
            {!containsPost && (
              <span className={cn(actionCount, "group-hover:text-brand", data.Liked && "text-brand")}>
                {formatNo(data.NoOfLikes)}
              </span>
            )}
          </button>

          <PostMaker
            type="comment"
            post={data}
            open={isPostMakerModalOpen}
            onOpenChange={setPostMakerModalOpen}
          >
            <div
              role="button"
              tabIndex={0}
              className={cn(actionBase, "hover:text-sky-500")}
            >
              <span className={cn(actionIconWrap, "group-hover:bg-sky-500/10")}>
                <MessageCircle className="size-[19px]" />
              </span>
              {!containsPost && (
                <span className={cn(actionCount, "group-hover:text-sky-500")}>
                  {formatNo(data.NoOfComment)}
                </span>
              )}
            </div>
          </PostMaker>

          <ShareButton
            post={data}
            triggerClassName={cn(actionBase.replace('flex', ''), "hover:text-emerald-600", data.Shared && "text-brand")}
          >
            <span className={cn(actionIconWrap, "group-hover:bg-emerald-500/10")}>
              <Repeat2 className={cn("size-[19px]", data.Shared && "text-brand")} />
            </span>
            {!containsPost && (
              <span
                className={cn(
                  actionCount,
                  "group-hover:text-emerald-600",
                  data.Shared && "text-brand"
                )}
              >
                {formatNo(data.NoOfShares)}
              </span>
            )}
          </ShareButton>

          <button
            type="button"
            aria-label={data.Bookmarked ? "Remove bookmark" : "Bookmark post"}
            aria-pressed={data.Bookmarked}
            onClick={() => handleClick("bookmarked")}
            className={cn(actionBase, "hover:text-brand", data.Bookmarked && "text-brand")}
          >
            <span className={cn(actionIconWrap, "group-hover:bg-brand/10")}>
              <Bookmark className={cn("size-[19px]", data.Bookmarked && "fill-brand text-brand")} />
            </span>
            {!containsPost && (
              <span
                className={cn(
                  actionCount,
                  "group-hover:text-brand",
                  data.Bookmarked && "text-brand"
                )}
              >
                {formatNo(data.NoOfBookmarks)}
              </span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};

export default PostCard;

function QuotedPostCard({
  handleActivePost,
  originalPost,
  time1,
}: {
  handleActivePost: (route: string) => void;
  originalPost: PostSchema;
  time1: string;
}) {
  return (
    <div
      role="link"
      tabIndex={0}
      className="mt-3 cursor-pointer rounded-2xl border border-border/70 p-3 transition-colors duration-150 ease-out-expo hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:p-4"
      onClick={() => handleActivePost(`/${originalPost.Username}/posts/${originalPost.PostID}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivePost(`/${originalPost.Username}/posts/${originalPost.PostID}`);
        }
      }}
    >
      <div className="flex items-start gap-2.5">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback>{originalPost.NameOfPoster.slice(0, 2)}</AvatarFallback>
          <AvatarImage className="cursor-pointer" alt="blogger" src={originalPost.DisplayPicture} />
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1 text-sm">
            <span className="truncate font-semibold">{originalPost.NameOfPoster}</span>
            {originalPost.Verified && <Statuser className="size-4 shrink-0" />}
            <span className="truncate text-muted-foreground">
              @{originalPost.Username} · {time1}
            </span>
          </div>
          {originalPost?.Caption ? (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
              {originalPost.Caption.length > 250
                ? renderTextWithLinks(originalPost.Caption.substring(0, 250)) + "..."
                : renderTextWithLinks(originalPost.Caption)}
            </p>
          ) : null}
          {originalPost.Image.length > 0 && (
            <ThreadsSlide className="mt-2" postData={originalPost} />
          )}
        </div>
      </div>
    </div>
  );
}

function Options({
  options,
  open,
  setOpen,
}: {
  options: Option[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { userdata } = useUser();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Handle mobile drawer
  const handleDrawerChange = (open: boolean) => {
    setIsDrawerOpen(open);
    setOpen(open);
  };

  // Handle desktop popover
  const handlePopoverChange = (open: boolean) => {
    setIsPopoverOpen(open);
    setOpen(open);
  };

  if (!userdata._id) return <></>

  return (
    <>
      <Drawer open={isDrawerOpen} onOpenChange={handleDrawerChange}>
        <DrawerTrigger asChild>
          <button
            type="button"
            aria-label="Post options"
            className="-m-2 rounded-full p-2 text-muted-foreground transition-colors duration-150 ease-out-expo hover:bg-accent tablets:hidden"
          >
            <Ellipsis className="size-[18px]" />
          </button>
        </DrawerTrigger>
        <DrawerContent className="bg-gray-50 tablets:hidden dark:bg-zinc-900 dark:text-slate-200">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-base font-semibold">Options</DrawerTitle>
            <DrawerDescription className="mt-1 flex flex-col gap-0.5">
              {options.map(({ icon, text, onClick, destructive }, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    onClick();
                    setIsDrawerOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-[15px] transition-colors duration-150 active:bg-muted",
                    destructive ? "text-destructive" : "text-foreground"
                  )}
                >
                  {icon}
                  <span className="truncate">{text}</span>
                </button>
              ))}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <DropdownMenu open={isPopoverOpen} onOpenChange={handlePopoverChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Post options"
            className="-m-2 hidden rounded-full p-2 text-muted-foreground transition-colors duration-150 ease-out-expo hover:bg-accent tablets:block"
          >
            <Ellipsis className="size-[18px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 bg-gray-50 p-1.5 dark:bg-zinc-900 dark:text-slate-200">
          {options.map(({ icon, text, onClick, destructive }, index) => (
            <DropdownMenuItem
              key={index}
              onClick={onClick}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm",
                destructive && "text-destructive focus:text-destructive"
              )}
            >
              {icon}
              <span className="truncate">{text}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function RenderLoadingPlaceholder() {
  return (
    <div className="w-full border-b border-border/70 bg-white px-4 py-3 sm:px-5 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-2/3 rounded-md" />
      </div>
      <Skeleton className="mt-3 h-44 w-full rounded-2xl" />
      <div className="mt-3 flex items-center justify-between">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="size-8 rounded-full" />
        ))}
      </div>
    </div>
  );
}
