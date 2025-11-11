/* eslint-disable camelcase */
/* eslint-disable tailwindcss/no-custom-classname */
"use client";
import {
  Copy,
  Delete,
  Ellipsis,
  Flag,
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
import { toast } from "@/hooks/use-toast";
import { getPost } from "@/lib/getStatus";
import { PostSchema } from "@/lib/types/type";
import { useAppDispatch } from "@/redux/hooks";
import { deletePost, updatePost } from "@/redux/postsSlice";
import { RootState } from "@/redux/store";

import PostMaker from "./PostMaker";
import ShareButton from "./ShareButton";
import { Skeleton } from "./ui/skeleton";
import MediaSlide from "../templates/mediaSlides";
import { Post, formatNo, timeFormatter, updateLiveTime } from "../templates/PostProps";

type PostComponentProps = {
  postData: Post["post"];
  showMedia?: boolean;
};

interface Option {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
}

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
  const router = useRouter();
  const [data, setData] = useState<PostSchema>({} as PostSchema);
  const [containsPost, setContainsPost] = useState(false);

  useEffect(() => {
    setContainsPost(window.location.pathname.includes("posts"));
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
      if (data.Liked) {
        setData({ ...data, NoOfLikes: data.NoOfLikes - 1, Liked: false });
        dispatch(
          updatePost({ id: data.PostID, updates: { NoOfLikes: data.NoOfLikes - 1, Liked: false } })
        );

        socket?.emit("reactToPost", {
          type: "unlike",
          key: "NoOfLikes",
          value: "dec",
          postId: data.PostID,
        });
      } else {
        setData({ ...data, NoOfLikes: data.NoOfLikes + 1, Liked: true });
        dispatch(
          updatePost({ id: data.PostID, updates: { NoOfLikes: data.NoOfLikes + 1, Liked: true } })
        );

        socket?.emit("reactToPost", {
          type: "like",
          key: "NoOfLikes",
          value: "inc",
          postId: data.PostID,
        });
      }
    }

    if (clicked === "bookmarked") {
      if (data.Bookmarked) {
        setData({ ...data, NoOfBookmarks: data.NoOfBookmarks - 1, Bookmarked: false });
        dispatch(
          updatePost({
            id: data.PostID,
            updates: { NoOfBookmarks: data.NoOfBookmarks - 1, Bookmarked: false },
          })
        );

        socket?.emit("reactToPost", {
          type: "unbookmark",
          key: "NoOfBookmarks",
          value: "dec",
          postId: data.PostID,
        });
      } else {
        setData({ ...data, NoOfBookmarks: data.NoOfBookmarks + 1, Bookmarked: true });
        dispatch(
          updatePost({
            id: data.PostID,
            updates: { NoOfBookmarks: data.NoOfBookmarks + 1, Bookmarked: true },
          })
        );

        socket?.emit("reactToPost", {
          type: "bookmark",
          key: "NoOfBookmarks",
          value: "inc",
          postId: data.PostID,
        });
      }
    }
  };

  const handleFollow = async (follow: boolean) => {
    try {
      const res = await fetch(`/api/follow`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followerId: userdata._id,
          followedId: data.UserId,
          time: new Date().toISOString(),
          follow,
        }),
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to follow user",
        variant: "destructive",
      });
    }
  };

  const options: Option[] = [
    ...(data.UserId !== userdata._id
      ? [
          {
            icon: data.IsFollowing ? <UserRoundMinus size={20} /> : <UserRoundPlus size={20} />,
            text: data.IsFollowing ? `Unfollow @${data.Username}` : `Follow @${data.Username}`,
            onClick: () => {
              handleFollow(!data.IsFollowing);
            },
          },
        ]
      : []),
    {
      icon: <Save size={20} />,
      text: "Save post",
      onClick: () => handleClick("bookmarked"),
    },
    {
      icon: <Share size={20} />,
      text: "Share post via…",
      onClick: async () => {
        if (navigator.share) {
          navigator.share({ url: `${window.location.origin}/${data.Username}/posts/${data.PostID}` });
        } else {
          try {
            await navigator.clipboard.writeText(
              `${window.location.protocol}//${window.location.host}/${data.Username}/posts/${data.PostID}`
            );
            toast({ title: "Post link copied!" });
          } catch (err) {
            console.error("Failed to copy post link to clipboard: ", err);
          }
        }
      },
    },
    {
      icon: <Copy size={20} />,
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
    ...(data.UserId === userdata._id
      ? [
          {
            icon: <Delete size={20} />,
            text: "Delete Post",
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
    ...(data.UserId !== userdata._id
      ? [
          {
            icon: <MessageCircleX size={20} />,
            text: `Mute @${data.Username}`,
            onClick: () => {},
          },
          {
            icon: <ShieldX size={20} />,
            text: `Block @${data.Username}`,
            onClick: () => {},
          },
          {
            icon: <Flag size={20} />,
            text: "Report post",
            onClick: () => {},
          },
        ]
      : []),
    {
      icon: <Minus size={20} />,
      text: "Remove post",
      onClick: () => {
        dispatch(deletePost(data.PostID));
        toast({
          title: "Post Removed.",
        });
      },
    },
  ];

  if (!data || !data.PostID) return <RenderLoadingPlaceholder />;

  return (
    <div className="pre-blog" id={data.PostID.slice(0, -4)}>
      <div
        className="blog !dark:shadow-bar-dark select-none shadow-md dark:bg-zinc-900 dark:text-slate-200"
        data-id={data.PostID}
      >
        {postType === "repost" && (
          <div className="repost flex items-center gap-2 text-xs text-brand">
            <Repeat2 size={20} />
            <span>
              Reposted by{" "}
              <Link href={`/${postData?.Username}`} className="font-bold sm:hover:underline">
                {postData?.Username}
              </Link>
            </span>
          </div>
        )}
        <div className="blogger-details">
          <div className="blog-top-left">
            <div className={data.Verified ? "blogger-img v" : "blogger-img"}>
              <Link href={`/${data.Username}/photo`} shallow>
                <Avatar>
                  <AvatarFallback>{data.NameOfPoster.slice(0, 2)}</AvatarFallback>
                  <AvatarImage
                    className="pdp size-9 cursor-pointer"
                    alt="blogger"
                    src={data.DisplayPicture}
                  />
                </Avatar>
              </Link>
            </div>
            <div className="blog-maker">
              <Link href={`/${data.Username}`}>
                <div className="flex flex-wrap items-center justify-start gap-1">
                  <span className="font-bold after:content-[.]">{data.NameOfPoster}</span>
                  {data.Verified ? <Statuser className="size-4" /> : null}
                  {containsPost ? null : <div className="text-xs text-brand">@{data.Username}</div>}
                </div>
              </Link>
              {containsPost ? (
                <div className="blog-username text-brand">@{data.Username}</div>
              ) : (
                <div className="blog-time">{time}</div>
              )}
            </div>
          </div>
          <div className="blog-top-right">
            <Options options={options} open={open} setOpen={setOpen} />
          </div>
        </div>
        <div
          className="blog-contents"
          onClick={() => handleActivePost(`/${data.Username}/posts/${data.PostID}`)}
        >
          {data.Caption && data.Caption.length > 250 && !containsPost ? (
            <>
              <abbr title={data.Caption}>
                <p className="whitespace-pre-wrap text-sm">
                  {renderTextWithLinks(data.Caption.substring(0, 250))}...{" "}
                  <span className="showMore">show more</span>
                </p>
              </abbr>
            </>
          ) : (
            <abbr title={data.Caption}>
              <p className="whitespace-pre-wrap text-sm">{renderTextWithLinks(data.Caption)}</p>
            </abbr>
          )}
        </div>
        {/* {showMore} */}
        {data?.Image.length > 0 && showMedia && (
          <MediaSlide
            postData={data}
            className={`${containsPost ? "" : "max-h-96"} ${data?.Image.length > 0 ? "mb-2 overflow-hidden rounded-xl" : ""}`}
            isLink
          />
        )}
        {/* Post Card */}
        {originalPost && (
          <Link href={`/${originalPost.Username}/posts/${originalPost.PostID}`}>
            <div className="rounded-xl border border-gray-800 p-4">
              <div className="flex items-start space-x-1">
                <div className="size-10 flex-shrink-0 overflow-hidden rounded-full">
                  <Avatar className="size-8">
                    <AvatarFallback>{originalPost.NameOfPoster.slice(0, 2)}</AvatarFallback>
                    <AvatarImage
                      className="pdp cursor-pointer"
                      alt="blogger"
                      src={originalPost.DisplayPicture}
                    />
                  </Avatar>
                </div>
                <div className={`w-[90%] ${data?.Image.length > 0 ? "grid" : ""}`}>
                  <div className="col-span-2 flex flex-wrap items-center text-sm">
                    <span className="mr-1 truncate font-bold dark:text-white">
                      {originalPost.NameOfPoster}
                    </span>
                    {originalPost.Verified && (
                      <svg className="size-4 fill-current text-brand" viewBox="0 0 24 24">
                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                      </svg>
                    )}
                    <span className="ml-1 text-gray-500">
                      @{originalPost.Username} · {time1}
                    </span>
                  </div>
                  {/* <div className="text-gray-500 text-sm mb-2">Replying to @NintendoAmerica</div> */}
                  {originalPost?.Caption ? (
                    <p
                      className={`mb-2 text-sm dark:text-white ${originalPost.Image.length > 0 ? "" : "col-span-2"} whitespace-pre-wrap`}
                    >
                      {originalPost.Caption.length > 250
                        ? renderTextWithLinks(originalPost.Caption.substring(0, 250)) + "..."
                        : renderTextWithLinks(originalPost.Caption)}
                    </p>
                  ) : null}
                  {/* {showMore} */}
                  {originalPost.Image.length > 0 && (
                    <MediaSlide
                      className={`overflow-auto rounded-lg ${!(originalPost?.Caption?.length > 0) ? "col-span-2" : ""}`}
                      postData={originalPost}
                    />
                  )}
                </div>
              </div>
            </div>
          </Link>
        )}
        {containsPost ? (
          <>
            <div className="blog-time border-t pt-1">
              {timeFormatter(data.TimeOfPost).replaceAll(":", " : ")}
            </div>
            <div className="flex flex-row flex-wrap items-center justify-start gap-2 border-b pb-1 text-sm">
              <div className="flex flex-row items-center gap-1">
                <span>{formatNo(data.NoOfLikes)}</span>
                <span>{data.NoOfLikes > 0 ? "Like" : "Likes"}</span>
              </div>
              <div className="flex flex-row items-center gap-1">
                <span>{formatNo(data.NoOfComment)}</span>
                <span>{data.NoOfComment > 0 ? "Comment" : "Comments"}</span>
              </div>
              <div className="flex flex-row items-center gap-1">
                <span>{formatNo(data.NoOfShares)}</span>
                <span>{data.NoOfShares > 0 ? "Share" : "Shares"}</span>
              </div>
              <div className="flex flex-row items-center gap-1">
                <span>{formatNo(data.NoOfBookmarks)}</span>
                <span>{data.NoOfBookmarks > 0 ? "Bookmark" : "Bookmarks"}</span>
              </div>
            </div>
          </>
        ) : null}
        {/* <Blog Footer> */}
        <div className="reaction-panel">
          <div className="blog-foot" id="like" onClick={() => handleClick("liked")}>
            <svg
              className={data.Liked ? "like-icon clicked" : "like-icon"}
              width="30px"
              height="30px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                className="!stroke-current dark:stroke-slate-200"
                d="M8.10627 18.2468C5.29819 16.0833 2 13.5422 2 9.1371C2 4.27416 7.50016 0.825464 12 5.50063L14 7.49928C14.2929 7.79212 14.7678 7.79203 15.0607 7.49908C15.3535 7.20614 15.3534 6.73127 15.0605 6.43843L13.1285 4.50712C17.3685 1.40309 22 4.67465 22 9.1371C22 13.5422 18.7018 16.0833 15.8937 18.2468C15.6019 18.4717 15.3153 18.6925 15.0383 18.9109C14 19.7294 13 20.5 12 20.5C11 20.5 10 19.7294 8.96173 18.9109C8.68471 18.6925 8.39814 18.4717 8.10627 18.2468Z"
                fill="#242742fd"
              />
            </svg>
            {!containsPost && <div className="likes">{formatNo(data.NoOfLikes)}</div>}
          </div>
          <PostMaker
            type="comment"
            post={data}
            open={isPostMakerModalOpen}
            onOpenChange={setPostMakerModalOpen}
          >
            <div className="blog-foot" id="comment" onClick={() => {
              const currParams = new URLSearchParams(searchParams?.toString() || "");
              currParams.set("composeComment", "true");
              currParams.set("postId", data.PostID);
              currParams.set("postType", "comment");
              router.push(`${pathname}?${currParams.toString()}`, { scroll: false });
            }}>
              <svg
                className="comment-icon"
                width="30px"
                height="30px"
                viewBox="0 -0.5 25 25"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  className="comment-icon-path dark:stroke-slate-200"
                  clipRule="evenodd"
                  d="M5.5 12C5.49988 14.613 6.95512 17.0085 9.2741 18.2127C11.5931 19.4169 14.3897 19.2292 16.527 17.726L19.5 18V12C19.5 8.13401 16.366 5 12.5 5C8.63401 5 5.5 8.13401 5.5 12Z"
                  stroke="#242742fd"
                  strokeWidth="1.0"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  className="comment-icon-path1 dark:fill-slate-200"
                  d="M9.5 13.25C9.08579 13.25 8.75 13.5858 8.75 14C8.75 14.4142 9.08579 14.75 9.5 14.75V13.25ZM13.5 14.75C13.9142 14.75 14.25 14.4142 14.25 14C14.25 13.5858 13.9142 13.25 13.5 13.25V14.75ZM9.5 10.25C9.08579 10.25 8.75 10.5858 8.75 11C8.75 11.4142 9.08579 11.75 9.5 11.75V10.25ZM15.5 11.75C15.9142 11.75 16.25 11.4142 16.25 11C16.25 10.5858 15.9142 10.25 15.5 10.25V11.75ZM9.5 14.75H13.5V13.25H9.5V14.75ZM9.5 11.75H15.5V10.25H9.5V11.75Z"
                  fill="#242742fd"
                />
              </svg>
              {!containsPost && <div className="comments">{formatNo(data.NoOfComment)}</div>}
            </div>
          </PostMaker>
          <ShareButton post={data}>
            <svg
              className={data.Shared ? "share-icon clicked" : "share-icon"}
              width="30px"
              height="30px"
              viewBox="-0.5 0 25 25"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              onClick={() => handleClick("shared")}
            >
              <path
                className="dark:stroke-slate-200"
                d="M13.47 4.13998C12.74 4.35998 12.28 5.96 12.09 7.91C6.77997 7.91 2 13.4802 2 20.0802C4.19 14.0802 8.99995 12.45 12.14 12.45C12.34 14.21 12.79 15.6202 13.47 15.8202C15.57 16.4302 22 12.4401 22 9.98006C22 7.52006 15.57 3.52998 13.47 4.13998Z"
                stroke="#242742fd"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {!containsPost && <div className="shares">{formatNo(data.NoOfShares)}</div>}
          </ShareButton>
          <div className="blog-foot" id="bookmark" onClick={() => handleClick("bookmarked")}>
            <svg
              className={data.Bookmarked ? "bookmark-icon clicked" : "bookmark-icon"}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                className="!stroke-current dark:stroke-slate-200"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M21 11.0975V16.0909C21 19.1875 21 20.7358 20.2659 21.4123C19.9158 21.735 19.4739 21.9377 19.0031 21.9915C18.016 22.1045 16.8633 21.0849 14.5578 19.0458C13.5388 18.1445 13.0292 17.6938 12.4397 17.5751C12.1494 17.5166 11.8506 17.5166 11.5603 17.5751C10.9708 17.6938 10.4612 18.1445 9.44216 19.0458C7.13673 21.0849 5.98402 22.1045 4.99692 21.9915C4.52615 21.9377 4.08421 21.735 3.73411 21.4123C3 20.7358 3 19.1875 3 16.0909V11.0975C3 6.80891 3 4.6646 4.31802 3.3323C5.63604 2 7.75736 2 12 2C16.2426 2 18.364 2 19.682 3.3323C21 4.6646 21 6.80891 21 11.0975ZM8.25 6C8.25 5.58579 8.58579 5.25 9 5.25H15C15.4142 5.25 15.75 5.58579 15.75 6C15.75 6.41421 15.4142 6.75 15 6.75H9C8.58579 6.75 8.25 6.41421 8.25 6Z"
                fill="#242742fd"
              />
            </svg>
            {!containsPost && <div className="bookmarks">{formatNo(data.NoOfBookmarks)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;

function Options({
  options,
  open,
  setOpen,
}: {
  options: Option[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
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

  return (
    <>
      <Drawer open={isDrawerOpen} onOpenChange={handleDrawerChange}>
        <DrawerTrigger asChild>
          <Ellipsis
            size={20}
            className="cursor-pointer tablets:hidden dark:text-gray-400"
            onClick={() => setOpen(true)}
          />
        </DrawerTrigger>
        <DrawerContent className="tablets:hidden">
          <DrawerHeader className="text-left">
            <DrawerTitle className="hidden">Options</DrawerTitle>
            <DrawerDescription className="flex flex-col gap-2">
              {options.map(({ icon, text, onClick }, index) => (
                <span
                  key={index}
                  className="flex cursor-pointer items-center gap-1"
                  onClick={onClick}
                >
                  {icon}
                  <span className="text-lg dark:text-white">{text}</span>
                </span>
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
          <Ellipsis
            size={20}
            className="hidden cursor-pointer tablets:block dark:text-gray-400"
            onClick={() => setOpen(true)}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-52 w-auto bg-white dark:bg-zinc-800" align="end">
          {options.map(({ icon, text, onClick }, index) => (
            <DropdownMenuItem
              key={index}
              onClick={onClick}
              className="flex w-52 m-2 cursor-pointer items-center gap-2 hover:bg-slate-200 hover:dark:bg-zinc-700"
            >
              {icon}
              <span className="text-base">{text}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function RenderLoadingPlaceholder() {
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
