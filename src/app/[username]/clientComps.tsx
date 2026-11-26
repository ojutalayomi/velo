"use client";
import { ArrowLeft, Cake, Check, Link, Plus, Pin, Loader2 } from "lucide-react";
import NextLink from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "@/lib/toast";

import { useSocket } from "@/app/providers/SocketProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MediaViewer } from "@/components/chat/MediaViewer";
import { Button } from "@/components/ui/button";
import { Statuser } from "@/components/VerificationComponent";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import type { PaginationMeta } from "@/lib/apiPagination";
import { submitFollowUpdate } from "@/lib/followApi";
import { countsAsPost, onPostRemoved, onPostRestored } from "@/lib/postEvents";
import { Attachment, ClientPostSchema } from "@/lib/types/type";
import { UserData } from "@/lib/types/user";
import { cn } from "@/lib/utils";
import { RootState } from "@/redux/store";
import { timeFormatter } from "@/templates/PostProps";

import ContentSection from "./ContentTabs";
import ProfileMenu from "./ProfileMenu";
import { useUser } from "../providers/UserProvider";

function postDedupeKey(p: ClientPostSchema) {
  return String(p.PostID ?? p._id);
}

export default function Profile({
  profileData: pd,
  profilePostCards,
  postsPagination: initialPagination,
}: {
  profileData: UserData;
  profilePostCards: ClientPostSchema[];
  postsPagination: PaginationMeta;
}) {
  const router = useRouter();
  const { userdata } = useUser();
  const socket = useSocket();
  const navigate = useNavigateWithHistory();
  const { conversations } = useSelector((state: RootState) => state.chat);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState(pd);
  const [postCards, setPostCards] = useState(profilePostCards);
  const [postsPagination, setPostsPagination] = useState(initialPagination);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  // The server's total, kept in step as posts are added and removed while the page is open.
  const [postTotal, setPostTotal] = useState(pd.postCount);
  const postCardsRef = useRef(postCards);
  useEffect(() => {
    postCardsRef.current = postCards;
  }, [postCards]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showTitle, setShowTitle] = useState(false);
  const nameRef = useRef<HTMLDivElement>(null);

  const openMessage = useCallback(() => {
    const otherId = String(profileData._id);
    const existingConvo = conversations.find(
      (convo) =>
        convo.type === "DM" &&
        convo.participants.length === 2 &&
        convo.participants.includes(otherId)
    );
    if (existingConvo) {
      router.push(`/chats/${existingConvo.id}`);
    } else {
      router.push(`/chats/new?otherId=${otherId}`);
    }
  }, [conversations, profileData._id, router]);

  const viewedProfileKey = `${pd._id}:${pd.username ?? ""}`;

  // Take a post off this profile and lower the total if it was one the total counts. `type` is
  // used when the post isn't in the loaded list, which is the only way to know what it was.
  const removeCard = useCallback((postId: string, type?: string) => {
    const card = postCardsRef.current.find((p) => p.PostID === postId);
    const kind = card?.Type ?? type;
    if (card) setPostCards((prev) => prev.filter((p) => p.PostID !== postId));
    if (countsAsPost(kind) && (card || type)) {
      setPostTotal((n) => (n === undefined ? n : Math.max(0, n - 1)));
    }
  }, []);
  const onDeleted = useCallback(
    (data: { postId: string; type?: string }) => removeCard(data.postId, data.type),
    [removeCard]
  );

  // Deleting your own post (the server doesn't echo it back to you) and a delete that failed.
  useEffect(() => {
    const offRemoved = onPostRemoved(({ postId, type }) => removeCard(postId, type));
    const offRestored = onPostRestored((post) => {
      if (String(post.UserId) !== String(pd._id)) return;
      if (postCardsRef.current.some((p) => postDedupeKey(p) === postDedupeKey(post))) return;
      setPostCards((prev) =>
        [...prev, post].sort((a, b) => +new Date(b.TimeOfPost) - +new Date(a.TimeOfPost))
      );
      if (countsAsPost(post.Type)) setPostTotal((n) => (n === undefined ? n : n + 1));
    });
    return () => {
      offRemoved();
      offRestored();
    };
  }, [pd._id, removeCard]);

  // The top bar shows the name and post count once the name in the profile has scrolled away.
  useEffect(() => {
    const el = nameRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowTitle(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [profileData._id]);

  useEffect(() => {
    if (!socket) return;

    const handleFollowNotification = (data: {
      followedDetails: UserData;
      followerDetails: UserData;
      following?: boolean;
      timestamp?: string;
    }) => {
      const followedId = data.followedDetails._id;
      const followerId = data.followerDetails._id;
      const me = userdata._id;
      const relationshipActive =
        typeof data.following === "boolean"
          ? data.following
          : Boolean(data.followedDetails.isFollowing);

      // Both followed and follower can receive this; only update UI when it matches this page / role.
      setProfileData((prev) => {
        if (prev._id !== followedId) return prev;
        return {
          ...prev,
          ...(data.followedDetails.followers != null
            ? { followers: data.followedDetails.followers }
            : {}),
          // Follow button is “do I follow this profile?” — only the follower cares.
          ...(followerId === me ? { isFollowing: relationshipActive } : {}),
        };
      });

      if (followerId === me) {
        setPostCards((prev) =>
          prev.map((post) =>
            post.UserId === followedId ? { ...post, IsFollowing: relationshipActive } : post
          )
        );
      }

      if (followedId === me) {
        toast(
          relationshipActive
            ? `${data.followerDetails.username} started following you`
            : `${data.followerDetails.username} unfollowed you`
        );
      }
    };

    socket.on("followNotification", handleFollowNotification);
    socket.on("deletePost", onDeleted);
    socket.on(
      "updatePost",
      (data: {
        excludeUserId: string;
        postId: string;
        update: Partial<ClientPostSchema>;
        type: string;
      }) => {
        console.info(data);
        setPostCards((prev) => {
          return prev.map((p) => (p.PostID === data.postId ? { ...p, ...data.update } : p));
        });
      }
    );
    const onNew = (data: { excludeUser: string; blog: ClientPostSchema }) => {
      // Only this profile's own items belong in its list (the event goes to everyone).
      if (String(data.blog?.UserId) !== String(pd._id)) return;
      if (postCardsRef.current.some((p) => postDedupeKey(p) === postDedupeKey(data.blog))) return;
      setPostCards((prev) => [data.blog, ...prev]);
      if (countsAsPost(data.blog.Type)) setPostTotal((n) => (n === undefined ? n : n + 1));
    };
    socket.on("newPost", onNew);

    return () => {
      socket.off("followNotification", handleFollowNotification);
      socket.off("deletePost", onDeleted);
      socket.off("newPost", onNew);
    };
  }, [socket, userdata._id, viewedProfileKey, pd._id, onDeleted]);

  if (!profileData || !profileData._id) {
    notFound();
  }

  const handleFollow = async (follow: boolean) => {
    // Prevent duplicate requests
    if (isLoading) return;

    // Save state before optimistic update for potential revert
    const profileId = profileData._id;
    const previousState = profileData.isFollowing ?? false;
    const previousFollowers = profileData.followers;

    try {
      setIsLoading(true);
      
      // Optimistic update
      if (follow) {
        setProfileData((prev) => ({
          ...prev,
          isFollowing: true,
          followers: typeof prev.followers === "number" ? prev.followers + 1 : prev.followers,
        }));
        setPostCards((prev) =>
          prev.map((post) => (post.UserId === profileId ? { ...post, IsFollowing: true } : post))
        );
      } else {
        setProfileData((prev) => ({
          ...prev,
          isFollowing: false,
          followers:
            typeof prev.followers === "number" && prev.followers > 0
              ? prev.followers - 1
              : prev.followers,
        }));
        setPostCards((prev) =>
          prev.map((post) => (post.UserId === profileId ? { ...post, IsFollowing: false } : post))
        );
      }

      const res = await submitFollowUpdate({
        followerId: String(userdata._id),
        followedId: String(profileData._id),
        follow,
      });
      
      if (!res.ok) {
        // Revert optimistic update on error
        setProfileData((prev) => ({
          ...prev,
          isFollowing: previousState,
          followers: previousFollowers,
        }));
        setPostCards((prev) =>
          prev.map((post) => (post.UserId === profileId ? { ...post, IsFollowing: previousState } : post))
        );
        
        const data = await res.json().catch(() => ({ message: "Failed to update follow status" }));
        toast.error(data.message || "Something went wrong");
      }
    } catch (error) {
      // Revert on network error
      setProfileData((prev) => ({
        ...prev,
        isFollowing: previousState,
        followers: previousFollowers,
      }));
      setPostCards((prev) =>
        prev.map((post) => (post.UserId === profileId ? { ...post, IsFollowing: previousState } : post))
      );
      
      console.error(error);
      toast.error("Error", {
        description: "Failed to follow user",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreProfilePosts = useCallback(async () => {
    const uname = profileData.username;
    if (!uname || !postsPagination.hasMore || postsLoadingMore) return;
    setPostsLoadingMore(true);
    try {
      const nextSkip = postsPagination.skip + postsPagination.limit;
      const res = await fetch(
        `/api/posts/${encodeURIComponent(uname)}?skip=${nextSkip}&limit=${postsPagination.limit}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const body = (await res.json()) as {
        data?: ClientPostSchema[];
        pagination?: PaginationMeta;
      };
      const chunk = body.data ?? [];
      const nextPage = body.pagination ?? postsPagination;
      setPostCards((prev) => {
        const seen = new Set(prev.map(postDedupeKey));
        const extra = chunk.filter((c) => !seen.has(postDedupeKey(c)));
        return [...prev, ...extra];
      });
      setPostsPagination(nextPage);
    } finally {
      setPostsLoadingMore(false);
    }
  }, [profileData.username, postsLoadingMore, postsPagination]);

  // The server's total; the loaded cards can only raise it (a post made just now).
  const loadedPosts = postCards.filter((post) => countsAsPost(post.Type)).length;
  const postCount = Math.max(postTotal ?? 0, loadedPosts);

  // Profile photo and cover, in one viewer you can swipe between.
  const photos: (Attachment & { label: string })[] = [
    { label: "Profile photo", url: profileData.displayPicture, name: `${profileData.username}-profile` },
    { label: "Cover photo", url: profileData.coverPhoto, name: `${profileData.username}-cover` },
  ]
    .filter((p) => !!p.url)
    .map((p) => ({ ...p, key: p.url as string, type: "image/jpeg" }));
  const openPhoto = (url?: string) => {
    const i = photos.findIndex((p) => p.url === url);
    if (i >= 0) setViewerIndex(i);
  };

  return (
    <div className="h-screen max-h-screen w-full overflow-auto dark:bg-black">
      {/* Over the cover at first (the content slides under it); a solid bar with the name and
          post count once the name in the profile has scrolled away. */}
      <div
        className={cn(
          "sticky top-0 z-20 -mb-14 flex h-14 w-full items-center gap-3 px-3 transition-colors duration-200",
          showTitle && "border-b bg-white/80 backdrop-blur-lg dark:border-zinc-800 dark:bg-black/70"
        )}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate()}
          className={cn(
            "flex size-9 items-center justify-center rounded-full transition-colors",
            showTitle
              ? "text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-zinc-800"
              : "bg-black/45 text-white backdrop-blur hover:bg-black/60"
          )}
        >
          <ArrowLeft className="size-5" />
        </button>
        <div
          aria-hidden={!showTitle}
          className={cn(
            "min-w-0 transition-opacity duration-200",
            showTitle ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          <p className="flex items-center gap-1 font-semibold">
            <span className="truncate">
              {profileData.firstname && profileData.lastname
                ? profileData.firstname + " " + profileData.lastname
                : "Velo"}
            </span>
            {profileData.verified && <Statuser className="size-4 shrink-0" />}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {postCount} post{postCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      {/* Cover Photo */}
      <div className="relative h-48 w-full bg-gray-200 dark:bg-gray-800">
        {profileData.coverPhoto && (
          <button
            type="button"
            aria-label="View cover photo"
            onClick={() => openPhoto(profileData.coverPhoto)}
            className="absolute inset-0 z-0 block size-full cursor-zoom-in"
          />
        )}
        {profileData.coverPhoto && (
          <Avatar className="size-full rounded-none object-cover">
            <AvatarImage
              className="aspect-auto size-full rounded-none object-cover"
              src={profileData.coverPhoto}
            />
            <AvatarFallback className="size-full rounded-none">
              {profileData.firstname && profileData.lastname
                ? profileData.firstname[0] + profileData.lastname[0] + " • Velo"
                : "Velo"}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      <div className="relative mx-auto px-4">
        {/* Profile Picture */}
        <div className="absolute -top-16 left-4 size-32">
          <button
            type="button"
            aria-label="View profile photo"
            disabled={!profileData.displayPicture}
            onClick={() => openPhoto(profileData.displayPicture)}
            className="block size-full overflow-hidden rounded-full border-4 border-white enabled:cursor-zoom-in dark:border-black"
          >
            <Avatar className="size-full">
              <AvatarImage className="size-full" src={profileData.displayPicture} />
              <AvatarFallback className="size-full">
                {profileData.firstname && profileData.lastname
                  ? profileData.firstname[0] + profileData.lastname[0]
                  : ""}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>

        <div className="absolute -top-4 right-4 flex items-center gap-2">
          <ProfileMenu
            username={profileData.username}
            profileId={profileData._id as unknown as string}
          />
          {(profileData._id !== userdata._id && !profileData.isPrivate) && (
            <Button
              onClick={openMessage}
              className="rounded-full bg-brand/90 px-4 py-2 text-white hover:bg-brand/80"
            >
              Message
            </Button>
          )}
          <div className="overflow-hidden rounded-full border-2 border-white dark:border-black">
            {profileData._id === userdata._id ? (
              <Button
                onClick={() => router.push(`/${profileData.username}/edit`)}
                className="rounded-full bg-brand/90 px-4 py-2 text-white hover:bg-brand/80"
              >
                Edit profile
              </Button>
            ) : (
              <Button
                onClick={() => handleFollow(!profileData.isFollowing)}
                className="flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-white hover:bg-brand/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : profileData.isFollowing ? (
                  <Check className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                {isLoading ? "Loading..." : profileData.isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="pb-2 pt-16">
          <div className="mb-2 flex items-start justify-between">
            <div ref={nameRef}>
              <div className="flex items-center gap-1">
                <h1 className="text-xl font-bold dark:text-white">{profileData.name}</h1>
                {profileData.verified && <Statuser className="size-4" />}
              </div>
              <p className="text-gray-600 dark:text-gray-400">@{profileData.username}</p>
            </div>
          </div>

          {/* Bio & Stats */}
          {profileData.bio && <p className="text-gray-800 dark:text-gray-200">{profileData.bio}</p>}
          <div className="flex flex-wrap gap-4">
            {profileData.location && (
              <span className="!ml-0 flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <Pin className="size-4" /> {profileData.location}
              </span>
            )}
            {profileData.dob && (
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <Cake className="size-4" />
                {timeFormatter(
                  new Date(profileData.dob).toISOString(),
                  String(profileData._id) === userdata._id,
                  false
                )}
              </span>
            )}
            {profileData.website && (
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <Link className="size-4" />
                <a
                  href={profileData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {profileData.website.replace("https://", "")}
                </a>
              </span>
            )}
          </div>
          {/* Stats */}
          <div className="flex gap-6 text-gray-600 dark:text-gray-400">
            <NextLink
              href={`/${profileData.username}/connections?tab=followers`}
              className="hover:underline"
            >
              {profileData.followers ?? 0} follower{profileData.followers === 1 ? "" : "s"}
            </NextLink>
            <NextLink
              href={`/${profileData.username}/connections?tab=following`}
              className="hover:underline"
            >
              {profileData.following ?? 0} following
            </NextLink>
            <span>
              {postCount} post
              {postCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>
      <ContentSection
        profileData={profileData}
        posts={postCards}
        postsHasMore={postsPagination.hasMore}
        onLoadMorePosts={loadMoreProfilePosts}
        postsLoadingMore={postsLoadingMore}
      />
      {photos.length > 0 && (
        <MediaViewer
          files={photos}
          open={viewerIndex !== null}
          index={viewerIndex ?? 0}
          onOpenChange={(open) => !open && setViewerIndex(null)}
        />
      )}
    </div>
  );
}
