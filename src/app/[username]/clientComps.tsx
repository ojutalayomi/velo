'use client'
import { notFound, useRouter } from "next/navigation";
import { UserData } from "@/lib/types/type";
import PostCard from "@/components/PostCard";
import { timeFormatter } from "@/templates/PostProps";
import { PostSchema } from '@/lib/types/type';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button";
import { Statuser } from "@/components/VerificationComponent";
import { ArrowLeft, Cake, Check, Ellipsis, Link, Plus, Pin, Loader2 } from "lucide-react";
import LeftSideBar from "@/components/LeftSideBar";
import ContentSection from "./ContentTabs";
import { useUser } from "../providers/UserProvider";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import { toast } from "@/hooks/use-toast";
import ProfileMenu from "./ProfileMenu";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from '@/redux/store';
import { useAppDispatch } from '@/redux/hooks';
import { useSocket } from "@/app/providers/SocketProvider";

export default function Profile({ profileData: pd, profilePostCards }: { profileData: UserData, profilePostCards: PostSchema[] }) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const {userdata, loading} = useUser();
    const socket = useSocket();
    const navigate = useNavigateWithHistory();
    const posts = useSelector((state: RootState) => state.posts)
    const [isLoading, setIsLoading] = useState(false);
    const [profileData, setProfileData] = useState(pd);
    const [postCards, setPostCards] = useState(profilePostCards);

    useEffect(() => {
        if (!socket) return;
        socket.on('followNotification', (data: { followedDetails: UserData, followerDetails: UserData, type: 'follow' | 'unfollow', timestamp: string }) => {
            setProfileData(prev => ({
                ...prev,
                followers: data.followedDetails.followers,
                isFollowing: data.followedDetails.isFollowing,
            }));

            // If current user is the follower, update follow state and posts
            if (data.followerDetails._id?.toString() === userdata._id) {
                setProfileData(prev => ({
                    ...prev,
                    isFollowing: data.followedDetails.isFollowing,
                }));
                setPostCards(prev =>
                    prev.map(post =>
                        post.UserId === (profileData?._id as unknown as string)
                            ? { ...post, IsFollowing: data.followedDetails.isFollowing ?? false }
                            : post
                    )
                );
            }

            // If current user is the followed user, show a notification
            if (data.followedDetails._id?.toString() === userdata._id) {
                toast({
                    title: data.followedDetails.isFollowing
                        ? `${data.followerDetails.username} started following you`
                        : `${data.followerDetails.username} unfollowed you`,
                    variant: 'default',
                });
            }
        });
        socket.on('deletePost', ( data: { excludeUser: string, postId: string, type: string } ) => {
            setPostCards((prev) => {
                return prev.filter(p => p.PostID !== data.postId)
            })
        })
        socket.on('updatePost', ( data: { excludeUserId: string, postId: string, update: Partial<PostSchema>, type: string } ) => {
            console.info(data);
            setPostCards((prev) => {
                return prev.map(p => p.PostID === data.postId ? {...p, ...data.update} : p)
            })
        })
        socket.on('newPost', ( data: { excludeUser: string, blog: PostSchema } ) => {
            setPostCards((prev) => {
                return [...prev, data.blog]
            })
        })

        return () => {
            // socket.off('followNotification');
        };
    }, [socket]);

    if (!profileData || !profileData._id) {
        notFound();
    }

    const handleFollow = async (follow: boolean) => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/follow`, {
                method: 'POST',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    followerId: userdata._id,
                    followedId: profileData._id,
                    time: new Date().toISOString(),
                    follow: follow
                })
            });
            if (res.ok) {
                const data = await res.json();
                // setIsFollowing(follow);
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to follow user",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="w-full flex h-screen max-h-screen dark:bg-black overflow-auto">
            <div className="md:w-3/5 h-screen max-h-screen dark:bg-black overflow-auto">
                <div className={`flex backdrop-blur-lg top-0 sticky gap-4 items-center z-10 w-full px-3 py-2`}>
                    <ArrowLeft 
                    onClick={() => navigate()}
                    className='p-1 text-gray-600 hover:text-gray-800 dark:text-gray-100 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out size-8'
                    />
                    <div>
                        <p className="flex items-center gap-1">{profileData.firstname && profileData.lastname ? profileData.firstname + ' ' + profileData.lastname : 'Velo'} {profileData.verified && (<Statuser className="size-4"/>)}</p>
                        <p className="text-sm text-gray-600">{profilePostCards.length} posts</p>
                    </div>
                </div>
                {/* Cover Photo */}
                <div className="h-48 w-full bg-gray-200 dark:bg-gray-800 relative">
                    {profileData.coverPhoto && (
                        <Avatar className="h-full w-full object-cover rounded-none">
                            <AvatarImage className="w-full h-full rounded-none object-cover aspect-auto" src={profileData.coverPhoto} />
                            <AvatarFallback className="w-full h-full rounded-none">
                                {profileData.firstname && profileData.lastname ? profileData.firstname[0] + profileData.lastname[0] + ' • Velo' : 'Velo'}
                            </AvatarFallback>
                        </Avatar>
                    )}
                </div>

                <div className="mx-auto px-4 relative">
                    {/* Profile Picture */}
                    <div className="absolute -top-16 left-4 w-32 h-32">
                        <div className="w-full h-full rounded-full border-4 border-white dark:border-black overflow-hidden">
                            <Avatar className="h-full w-full">
                                <AvatarImage className="w-full h-full" src={profileData.displayPicture} />
                                <AvatarFallback className="w-full h-full">
                                    {profileData.firstname && profileData.lastname ? profileData.firstname[0] + profileData.lastname[0] : ''}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>

                    <div className="absolute -top-4 right-4 flex items-center gap-2">
                        <ProfileMenu username={profileData.username} profileId={profileData._id as unknown as string} />
                        <div className="rounded-full border-2 border-white dark:border-black overflow-hidden">
                            {profileData._id as unknown as string === userdata._id ?
                            <Button onClick={() => router.push(`/${profileData.username}/edit`)} className="px-4 py-2 bg-brand/90 text-white rounded-full hover:bg-brand/80">
                                Edit profile
                            </Button> :
                            <Button onClick={() => handleFollow(!profileData.isFollowing)} className="px-4 py-2 flex items-center gap-2 bg-brand text-white rounded-full hover:bg-brand/90" disabled={isLoading}>
                                {isLoading ? <Loader2 className="size-4 animate-spin" /> : profileData.isFollowing ? <Check className="size-4" /> : <Plus className="size-4" />}
                                {isLoading ? 'Loading...' : profileData.isFollowing ? 'Following' : 'Follow'}
                            </Button>
                            }
                        </div>
                    </div>

                    {/* Profile Info */}
                    <div className="pt-16 pb-2">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="flex items-center gap-1">
                                    <h1 className="text-xl font-bold dark:text-white">{profileData.name}</h1>
                                    {profileData.verified && (
                                        <Statuser className="size-4"/>
                                    )}
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">@{profileData.username}</p>
                            </div>
                        </div>

                        {/* Bio & Stats */}
                        {profileData.bio && (
                            <p className="text-gray-800 dark:text-gray-200">{profileData.bio}</p>
                        )}
                        <div className="flex gap-4 flex-wrap">
                            {profileData.location && (
                                <span className="text-gray-600 dark:text-gray-400 !ml-0 flex items-center gap-1"><Pin className="size-4" /> {profileData.location}</span>
                            )}
                            {profileData.dob && (
                                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    <Cake className="size-4" /> 
                                    {timeFormatter(new Date(profileData.dob).toISOString(), (String(profileData._id) === userdata._id), false)}
                                </span>
                            )}
                            {profileData.website && (
                                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    <Link className="size-4" />
                                    <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                        {profileData.website.replace("https://", "")}
                                    </a>
                                </span>
                            )}
                        </div>
                        {/* Stats */}
                        <div className="flex gap-6 text-gray-600 dark:text-gray-400">
                            <span>{profileData.followers ?? 0} follower{profileData.followers === 1 ? '' : 's'}</span>
                            <span>{profileData.following ?? 0} following</span>
                            <span>{profilePostCards.filter(post => post.Type === 'post').length} post{profilePostCards.filter(post => post.Type === 'post').length === 1 ? '' : 's'}</span>
                        </div>
                    </div>
                </div>
                <ContentSection profileData={profileData} posts={postCards}/>
            </div>

            <LeftSideBar />
        </div>
    );
}