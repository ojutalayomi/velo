"use client";
import { PollCard } from "@/components/PollCard";
import {
  Bookmark,
  Copy,
  Delete,
  Ellipsis,
  Flag,
  Heart,
  MessageCircle,
  MapPin,
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
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "@/lib/toast";

import ReportDialog from "@/components/ReportDialog";

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
import { ClientPostSchema } from "@/lib/types/type";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/redux/hooks";
import { emitPostRemoved, emitPostRestored } from "@/lib/postEvents";
import { removeFollowingPostsByAuthor } from "@/redux/followingFeedSlice";
import { addPost, deletePost, removePostsByAuthor, updatePost } from "@/redux/postsSlice";
import { setUserBlocked, setUserMuted } from "@/lib/userRelations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  update: Partial<ClientPostSchema>;
  type?: string;
};

const isPostMatch = (post: Partial<ClientPostSchema> | null | undefined, postId: string) =>
  post?._id === postId || post?.PostID === postId;

/** Merge only fields the store actually knows about, preserving local-only state. */
function mergeFreshPost(prev: ClientPostSchema, fresh: ClientPostSchema): ClientPostSchema {
  let changed = false;
  const merged: Record<string, unknown> = { ...prev };
  for (const [key, value] of Object.entries(fresh)) {
    if (value !== undefined && merged[key] !== value) {
      merged[key] = value;
      changed = true;
    }
  }
  return changed ? (merged as unknown as ClientPostSchema) : prev;
}

const actionBase =
  "group flex select-none items-center gap-1 rounded-full text-muted-foreground outline-hidden duration-150 ease-out-expo motion-reduce:transition-colors motion-safe:transition-[color,transform] motion-safe:active:scale-[0.94]";
const actionIconWrap =
  "-m-1.5 grid place-items-center rounded-full p-1.5 transition-colors duration-150 ease-out-expo";
const actionCount = "min-w-4 text-xs tabular-nums";

const PostCard = ({ postData, showMedia = true }: PostComponentProps) => {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const socket = useSocket();
  const { userdata } = useUser();
  const posts = useSelector((state: RootState) => state.posts.posts);
  const [localOriginalPost, setOriginalPost] = useState<ClientPostSchema | null>(null);
  const [isPostMakerModalOpen, setPostMakerModalOpen] = useState(false);
  const [, setOptionsOpen] = useState(false);
  const [, setTick] = useState(0);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isCaptionCopied, setIsCaptionCopied] = useState(false);
  const router = useRouter();
  const [localData, setData] = useState<ClientPostSchema>({} as ClientPostSchema);
  const [isResolvingPost, setIsResolvingPost] = useState(true);
  const [removedPostId, setRemovedPostId] = useState<string | null>(null);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const reactionSnapshotRef = useRef<ClientPostSchema | null>(null);
  const pendingDeleteRef = useRef<ClientPostSchema | null>(null);

  const containsPost = pathname?.includes("/posts") ?? false;

  // The store is authoritative for anything another card or view updated
  // (likes, comments, shares); merge it over the local snapshot on render.
  const storePost = localData.PostID
    ? posts.find((post: ClientPostSchema) => post.PostID === localData.PostID)
    : undefined;
  // Recovery path: a repost whose target was not loaded yet resolves as soon
  // as that target shows up in the store, without refetching.
  const lateOriginalPost =
    !localData.PostID && postData.OriginalPostId
      ? posts.find((post: ClientPostSchema) => post.PostID === postData.OriginalPostId)
      : undefined;
  const data = storePost
    ? mergeFreshPost(localData, storePost)
    : lateOriginalPost ?? localData;
  const storeOriginalPost = localOriginalPost?.PostID
    ? posts.find((post: ClientPostSchema) => post.PostID === localOriginalPost.PostID)
    : undefined;
  const lateNestedOriginalPost = lateOriginalPost?.OriginalPostId
    ? posts.find((post: ClientPostSchema) => post.PostID === lateOriginalPost.OriginalPostId)
    : undefined;
  const originalPost =
    localOriginalPost && storeOriginalPost
      ? mergeFreshPost(localOriginalPost, storeOriginalPost)
      : localOriginalPost ?? lateNestedOriginalPost ?? null;
  const time = data.TimeOfPost ? updateLiveTime("getlivetime", data.TimeOfPost) : "";
  const time1 = originalPost?.TimeOfPost
    ? updateLiveTime("getlivetime", originalPost.TimeOfPost)
    : "";

  const latestRef = useRef({ data, originalPost, postData });
  useEffect(() => {
    latestRef.current = { data, originalPost, postData };
  });

  useEffect(() => {
    let cancelled = false;

    const fetchPost = async (postId: string) => {
      if (!postId) return null;
      try {
        const response = await getPost(postId);
        return response?.post ?? null;
      } catch (error) {
        console.error("Failed to load original post:", error);
        return null;
      }
    };

    (async () => {
      if (!postData?.PostID) {
        if (!cancelled) {
          setData({} as ClientPostSchema);
          setIsResolvingPost(false);
        }
        return;
      }

      if (postData.Type !== "repost" && postData.Type !== "quote") {
        if (cancelled) return;
        setOriginalPost(null);
        setData(postData);
        setIsResolvingPost(false);
        return;
      }

      setIsResolvingPost(true);
      const originalId = postData.OriginalPostId;
      if (!originalId) {
        if (!cancelled) {
          setData(postData);
          setIsResolvingPost(false);
        }
        return;
      }

      // Reposts carry no content of their own: resolve the post they point at,
      // falling back to the API when it is not in the loaded feed.
      const cached = posts.find((post: ClientPostSchema) => post.PostID === originalId);
      const resolved = cached ?? (await fetchPost(originalId));
      if (cancelled) return;

      if (!resolved) {
        setData({} as ClientPostSchema);
        setOriginalPost(null);
        setIsResolvingPost(false);
        return;
      }

      if (postData.Type === "quote") {
        setData(postData);
        setOriginalPost(resolved);
      } else {
        setData(resolved);
        if (resolved.OriginalPostId) {
          const nested =
            posts.find((post: ClientPostSchema) => post.PostID === resolved.OriginalPostId) ??
            (await fetchPost(resolved.OriginalPostId));
          if (cancelled) return;
          setOriginalPost(nested);
        } else {
          setOriginalPost(null);
        }
      }

      if (!cancelled) setIsResolvingPost(false);
    })();

    return () => {
      cancelled = true;
    };
    // `posts` is intentionally read as a snapshot; store updates are merged below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postData]);

  useEffect(() => {
    const interval = setInterval(() => setTick((tick) => tick + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleDeletePost = (event: DeletePostEvent) => {
      const { data, originalPost, postData } = latestRef.current;
      const deletesPassedPost = isPostMatch(postData, event.postId);
      const deletesRenderedPost = isPostMatch(data, event.postId);
      const deletesOriginalPost = isPostMatch(originalPost, event.postId);

      if (deletesOriginalPost) {
        setOriginalPost(null);
      }

      if (deletesPassedPost || deletesRenderedPost) {
        // A repost has no content of its own, so deleting its target leaves a
        // dead card behind; drop both ids and hide the card immediately.
        dispatch(deletePost(event.postId));
        if (postData.PostID && !isPostMatch(postData, event.postId)) {
          dispatch(deletePost(postData.PostID));
        }
        setRemovedPostId(postData.PostID ?? event.postId);
        setData({} as ClientPostSchema);
      }
    };

    const handleUpdatePost = (event: UpdatePostEvent) => {
      const { data, originalPost, postData } = latestRef.current;
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

    const handleReactionResponse = (event: {
      message: string;
      success: boolean;
      postId?: string;
    }) => {
      if (event.success) {
        reactionSnapshotRef.current = null;
        return;
      }

      const snapshot = reactionSnapshotRef.current;
      if (!snapshot) return;
      if (event.postId && !isPostMatch(snapshot, event.postId)) return;

      reactionSnapshotRef.current = null;
      setData(snapshot);
      dispatch(updatePost({ id: snapshot.PostID, updates: snapshot }));
      toast.error("Error", { description: event.message });
    };

    const handleDeleteResponse = (event: { message: string; success: boolean }) => {
      const snapshot = pendingDeleteRef.current;
      if (!snapshot) return;
      pendingDeleteRef.current = null;
      if (event.success) return;

      // Undo the optimistic removal so the card comes back where it can.
      const { postData } = latestRef.current;
      dispatch(addPost(snapshot));
      emitPostRestored(snapshot);
      if (postData.PostID && !isPostMatch(postData, snapshot.PostID)) {
        dispatch(addPost(postData));
      }
      setRemovedPostId(null);
      setData(snapshot);
      toast.error("Error", { description: event.message });
    };

    socket.on("deletePost", handleDeletePost);
    socket.on("updatePost", handleUpdatePost);
    socket.on("post_reaction_response", handleReactionResponse);
    socket.on("delete_post_response", handleDeleteResponse);

    return () => {
      socket.off("deletePost", handleDeletePost);
      socket.off("updatePost", handleUpdatePost);
      socket.off("post_reaction_response", handleReactionResponse);
      socket.off("delete_post_response", handleDeleteResponse);
    };
  }, [dispatch, socket]);

  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const relationBusyRef = useRef(false);

  /** Mute or block this post's author, then take their posts out of the feeds on screen. */
  const changeRelation = async (kind: "mute" | "block") => {
    if (relationBusyRef.current || !data.UserId) return;
    relationBusyRef.current = true;
    try {
      const error = await (kind === "mute" ? setUserMuted : setUserBlocked)(data.UserId, true);
      if (error) {
        toast.error(error);
        return;
      }
      dispatch(removePostsByAuthor(data.UserId));
      dispatch(removeFollowingPostsByAuthor(data.UserId));
      toast(
        kind === "mute"
          ? `Muted @${data.Username}. Their posts won't show in your feeds.`
          : `Blocked @${data.Username}.`
      );
    } finally {
      relationBusyRef.current = false;
    }
  };

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
      reactionSnapshotRef.current = data;
      const { next, emit } = togglePostLike(data);
      setData(next);
      dispatch(
        updatePost({ id: data.PostID, updates: { NoOfLikes: next.NoOfLikes, Liked: next.Liked } })
      );
      socket?.emit("reactToPost", emit);
      return;
    }

    if (clicked === "bookmarked") {
      reactionSnapshotRef.current = data;
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
    // Optimistic update
    const previousState = data.IsFollowing;
    setData((prev) => ({ ...prev, IsFollowing: follow }));
    dispatch(updatePost({ id: data.PostID, updates: { IsFollowing: follow } }));

    try {
      const res = await submitFollowUpdate({
        followerId: String(userdata._id),
        followedId: String(data.UserId),
        follow,
      });
      
      if (!res.ok) {
        // Revert optimistic update
        setData((prev) => ({ ...prev, IsFollowing: previousState }));
        dispatch(updatePost({ id: data.PostID, updates: { IsFollowing: previousState } }));
        
        const errorData = await res.json().catch(() => ({ message: "Failed to update follow status" }));
        toast.error("Error", {
          description: errorData.message || "Failed to follow user",
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      setData((prev) => ({ ...prev, IsFollowing: previousState }));
      dispatch(updatePost({ id: data.PostID, updates: { IsFollowing: previousState } }));
      
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
              pendingDeleteRef.current = data;
              socket?.emit("deletePost", {
                postId: data.PostID,
                type: data.Type,
                parentId: data.ParentId,
              });
              // The server excludes the actor from the broadcast, so remove the
              // card locally (rolled back by `delete_post_response` on failure).
              dispatch(deletePost(data.PostID));
              emitPostRemoved({ postId: data.PostID, type: data.Type });
              if (postData.PostID && !isPostMatch(postData, data.PostID)) {
                dispatch(deletePost(postData.PostID));
              }
              setRemovedPostId(postData.PostID ?? data.PostID);
              setData({} as ClientPostSchema);
            },
          },
        ]
      : []),
    ...(userdata._id && data.UserId !== userdata._id
      ? [
          {
            icon: <MessageCircleX size={18} />,
            text: `Mute @${data.Username}`,
            onClick: () => void changeRelation("mute"),
          },
          {
            icon: <ShieldX size={18} />,
            text: `Block @${data.Username}`,
            onClick: () => setBlockOpen(true),
          },
          {
            icon: <Flag size={18} />,
            text: "Report post",
            onClick: () => setReportOpen(true),
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

  const isRemoved = removedPostId !== null && removedPostId === postData.PostID;

  if (isRemoved) return <></>;
  if (!data.PostID) return isResolvingPost ? <RenderLoadingPlaceholder /> : <></>;

  const isCaptionTruncated =
    Boolean(data.Caption) && data.Caption.length > 250 && !containsPost && !showFullCaption;

  return (
    <article
      id={data.PostID.slice(0, -4)}
      data-id={data.PostID}
      data-post-analytics-id={postData.PostID}
      className={cn(
        "w-full bg-white text-foreground dark:bg-zinc-900",
        containsPost ? "border border-border/70" : "border-b border-border/70"
      )}
    >
      <div className={cn(containsPost ? "p-4 sm:p-5" : "px-4 py-3 sm:px-5")}>
        {postData.Type === "repost" && (
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
              <AvatarFallback>{(data.NameOfPoster ?? "").slice(0, 2)}</AvatarFallback>
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

          <Options options={options} setOpen={setOptionsOpen} />
        </div>

        <div
          className="mt-1 cursor-pointer"
          onClick={() => handleActivePost(`/${data.Username}/posts/${data.PostID}`)}
        >
          {data.Caption ? (
            <p className="whitespace-pre-wrap wrap-break-word text-[15px] leading-relaxed">
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

        {data.Location?.name && (
          <a
            href={
              data.Location.lat !== undefined && data.Location.lng !== undefined
                ? `https://www.openstreetmap.org/?mlat=${data.Location.lat}&mlon=${data.Location.lng}#map=14/${data.Location.lat}/${data.Location.lng}`
                : `https://www.openstreetmap.org/search?query=${encodeURIComponent(data.Location.name)}`
            }
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1.5 inline-flex max-w-full items-center gap-1 text-sm text-muted-foreground hover:text-brand"
          >
            <MapPin size={14} className="shrink-0" />
            <span className="truncate">{data.Location.name}</span>
          </a>
        )}

        {data.Poll && (
          <PollCard
            targetType="post"
            targetId={data.PostID}
            poll={data.Poll}
            className="mt-3 rounded-xl border border-border/70 p-3"
          />
        )}

        {(data.Image?.length ?? 0) > 0 && showMedia && (
          <ThreadsSlide postData={data} className="mt-3 max-w-md" isLink />
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
            onPosted={(postedType) => {
              if (postedType !== "comment") return;
              const nextCount = data.NoOfComment + 1;
              setData((prev) => (prev.PostID ? { ...prev, NoOfComment: nextCount } : prev));
              dispatch(
                updatePost({ id: data.PostID, updates: { NoOfComment: nextCount } })
              );
            }}
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
            onShareCommitted={(postId, updates) => {
              setData((prev) => (prev.PostID === postId ? { ...prev, ...updates } : prev));
              dispatch(updatePost({ id: postId, updates }));
            }}
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
      <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block @{data.Username}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their posts will stop showing in your feeds. You can unblock them any time from their profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void changeRelation("block")}>Block</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        type="post"
        targetId={data.PostID}
        targetUserId={data.UserId}
      />
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
  originalPost: ClientPostSchema;
  time1: string;
}) {
  return (
    <div
      role="link"
      tabIndex={0}
      className="mt-3 max-w-md cursor-pointer rounded-2xl border border-border/70 p-3 transition-colors duration-150 ease-out-expo hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 sm:p-4"
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
          <AvatarFallback>{(originalPost.NameOfPoster ?? "").slice(0, 2)}</AvatarFallback>
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
            <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">
              {originalPost.Caption.length > 250
                ? renderTextWithLinks(originalPost.Caption.substring(0, 250)) + "..."
                : renderTextWithLinks(originalPost.Caption)}
            </p>
          ) : null}
          {(originalPost.Image?.length ?? 0) > 0 && (
            <ThreadsSlide className="mt-2 max-w-sm" postData={originalPost} />
          )}
        </div>
      </div>
    </div>
  );
}

function Options({
  options,
  setOpen,
}: {
  options: Option[];
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
