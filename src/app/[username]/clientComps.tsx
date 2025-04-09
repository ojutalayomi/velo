'use client'
import { notFound, useRouter } from "next/navigation";
import { UserSchema } from "@/lib/types/type";
import PostCard from "@/components/PostCard";
import { PostData } from "@/templates/PostProps";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Statuser } from "@/components/VerificationComponent";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import LeftSideBar from "@/components/LeftSideBar";
import { navigate } from "@/lib/utils";

export default function Profile({ userData, userPostCard }: { userData: UserSchema, userPostCard: PostData[] }) {
    const hostname = 'https://s3.amazonaws.com/profile-display-images/';
    const hostname1 = 'https://s3.amazonaws.com/profile-banner-images/';
    const router = useRouter()
    const user = useSelector((state: RootState) => state.user.userdata)

    if (!userData) {
        notFound();
    }

    return (
        <div className="w-full flex h-screen max-h-screen dark:bg-black overflow-auto">
            <div className="md:w-3/5 h-screen max-h-screen dark:bg-black overflow-auto">
                <div className={`flex backdrop-blur-lg top-0 sticky gap-4 items-center z-10 w-full px-3 py-2`}>
                    <ArrowLeft 
                    onClick={() => navigate(router)}
                    className='p-1 icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-100 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out size-8'
                    />
                    <div>
                        <p className="flex items-center gap-1">{userData.firstname && userData.lastname ? userData.firstname + ' ' + userData.lastname : 'Velo'} {userData.verified && (<Statuser className="size-4"/>)}</p>
                        <p className="text-sm text-gray-600">{userPostCard.length} posts</p>
                    </div>
                </div>
                {/* Cover Photo */}
                <div className="h-48 w-full bg-gray-200 dark:bg-gray-800 relative">
                    {userData.coverPhoto && (
                        <Avatar className="h-full w-full object-cover rounded-none">
                            <AvatarImage className="w-full h-full rounded-none object-cover aspect-auto" src={hostname1+userData.coverPhoto} />
                            <AvatarFallback className="w-full h-full rounded-none">
                                {userData.firstname && userData.lastname ? userData.firstname[0] + userData.lastname[0] + ' • Velo' : 'Velo'}
                            </AvatarFallback>
                        </Avatar>
                    )}
                </div>

                <div className="mx-auto px-4 relative">
                    {/* Profile Picture */}
                    <div className="absolute -top-16 left-4 w-32 h-32">
                        <div className="w-full h-full rounded-full border-4 border-white dark:border-black overflow-hidden">
                            <Avatar className="h-full w-full">
                                <AvatarImage className="w-full h-full" src={userData.displayPicture} />
                                <AvatarFallback className="w-full h-full">
                                    {userData.firstname && userData.lastname ? userData.firstname[0] + userData.lastname[0] : ''}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>

                    {/* Profile Info */}
                    <div className="pt-20 pb-8">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-2xl font-bold dark:text-white">{userData.name}</h1>
                                    {userData.verified && (
                                        <Statuser className="size-4"/>
                                    )}
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">@{userData.username}</p>
                            </div>
                            {userData._id as unknown as string === user._id ?
                            <Button onClick={() => router.push(`/${user.username}/edit`)} className="px-4 py-2 bg-brand/90 text-white rounded-full hover:bg-brand/80">
                                Edit profile
                            </Button> :
                            <Button className="px-4 py-2 bg-brand/90 text-white rounded-full hover:bg-brand/80">
                                Follow
                            </Button>
                            }
                        </div>

                        {/* Bio & Stats */}
                        {userData.bio && (
                            <p className="text-gray-800 dark:text-gray-200 mb-4">{userData.bio}</p>
                        )}
                        <div className="flex gap-6 text-gray-600 dark:text-gray-400">
                            <span>{userData.followers?.length || 0} followers</span>
                            <span>{userData.following?.length || 0} following</span>
                            <span>{userPostCard.length} posts</span>
                        </div>
                    </div>

                    {/* PostCard Grid */}
                    <div className="grid grid-cols-1 gap-4">
                        {userPostCard.map((post, index) => (
                            <div key={post.PostID + index} className={`w-full h-fit rounded-xl bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow`}>
                               <PostCard postData={post} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <LeftSideBar />
        </div>
    );
}