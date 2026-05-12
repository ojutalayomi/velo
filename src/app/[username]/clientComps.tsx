"use client";
import { ArrowLeft, Cake, Check, Link, Plus, Pin, Loader2 } from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useSocket } from "@/app/providers/SocketProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Statuser } from "@/components/VerificationComponent";
import { toast } from "sonner";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import type { PaginationMeta } from "@/lib/apiPagination";
import { submitFollowUpdate } from "@/lib/followApi";
import { PostSchema } from "@/lib/types/type";
import { UserData } from "@/lib/types/user";
import { userIdString } from "@/lib/utils";
import { timeFormatter } from "@/templates/PostProps";

import ContentSection from "./ContentTabs";
import ProfileMenu from "./ProfileMenu";
import { useUser } from "../providers/UserProvider";

function postDedupeKey(p: PostSchema) {
  return String(p.PostID ?? p._id);
}

export default function Profile({
  profileData: pd,
  profilePostCards,
  postsPagination: initialPagination,
}: {
  profileData: UserData;
  profilePostCards: PostSchema[];
  postsPagination: PaginationMeta;
}) {
  const router = useRouter();
  const { userdata } = useUser();
  const socket = useSocket();
  const navigate = useNavigateWithHistory();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState(pd);
  const [postCards, setPostCards] = useState(profilePostCards);
  const [postsPagination, setPostsPagination] = useState(initialPagination);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);

  const viewedProfileKey = `${pd._id}:${pd.username ?? ""}`;

  useEffect(() => {
    setProfileData(pd);
    setPostCards(profilePostCards);
    setPostsPagination(initialPagination);
  }, [viewedProfileKey, pd, profilePostCards, initialPagination]);

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
    socket.on("deletePost", (data: { excludeUser: string; postId: string; type: string }) => {
      setPostCards((prev) => {
        return prev.filter((p) => p.PostID !== data.postId);
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
        console.info(data);
        setPostCards((prev) => {
          return prev.map((p) => (p.PostID === data.postId ? { ...p, ...data.update } : p));
        });
      }
    );
    socket.on("newPost", (data: { excludeUser: string; blog: PostSchema }) => {
      setPostCards((prev) => {
        return [...prev, data.blog];
      });
    });

    return () => {
      socket.off("followNotification", handleFollowNotification);
    };
  }, [socket, userdata._id, viewedProfileKey]);

  if (!profileData || !profileData._id) {
    notFound();
  }

  const handleFollow = async (follow: boolean) => {
    try {
      setIsLoading(true);
      const res = await submitFollowUpdate({
        followerId: String(userdata._id),
        followedId: String(profileData._id),
        follow,
      });
      if (res.ok) {
        const profileId = profileData._id;
        if (follow) {
          setProfileData((prev) => ({
            ...prev,
            isFollowing: true,
            followers: typeof prev.followers === "number" ? prev.followers + 1 : prev.followers,
          }));
          setPostCards((prev) =>
            prev.map((post) =>
              post.UserId === profileId ? { ...post, IsFollowing: true } : post
            )
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
            prev.map((post) =>
              post.UserId === profileId ? { ...post, IsFollowing: false } : post
            )
          );
        }
      }
    } catch (error) {
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
        data?: PostSchema[];
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

  const postCount = postCards.filter((post) => post.Type === "post").length;

  return (
    <div className="h-screen max-h-screen overflow-auto w-full dark:bg-black">
      <div
        className={`sticky top-0 z-10 flex w-full items-center gap-4 px-3 py-2 backdrop-blur-lg`}
      >
        <ArrowLeft
          onClick={() => navigate()}
          className="size-8 cursor-pointer p-1 text-gray-600 transition-colors duration-300 ease-in-out hover:text-gray-800 dark:text-gray-100 dark:hover:text-gray-200"
        />
        <div>
          <p className="flex items-center gap-1">
            {profileData.firstname && profileData.lastname
              ? profileData.firstname + " " + profileData.lastname
              : "Velo"}{" "}
            {profileData.verified && <Statuser className="size-4" />}
          </p>
          <p className="text-sm text-gray-600">{postCards.length} posts</p>
        </div>
      </div>
      {/* Cover Photo */}
      <div className="relative h-48 w-full bg-gray-200 dark:bg-gray-800">
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
          <div className="size-full overflow-hidden rounded-full border-4 border-white dark:border-black">
            <Avatar className="size-full">
              <AvatarImage className="size-full" src={profileData.displayPicture} />
              <AvatarFallback className="size-full">
                {profileData.firstname && profileData.lastname
                  ? profileData.firstname[0] + profileData.lastname[0]
                  : ""}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="absolute -top-4 right-4 flex items-center gap-2">
          <ProfileMenu
            username={profileData.username}
            profileId={profileData._id as unknown as string}
          />
          <div className="overflow-hidden rounded-full border-2 border-white dark:border-black">
            {(profileData._id as unknown as string) === userdata._id ? (
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
            <div>
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
            <span>
              {profileData.followers ?? 0} follower{profileData.followers === 1 ? "" : "s"}
            </span>
            <span>{profileData.following ?? 0} following</span>
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
    </div>
  );
}
