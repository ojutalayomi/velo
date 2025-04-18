'use client'
import { notFound, useRouter } from "next/navigation";
import { UserSchema } from "@/lib/types/type";
import PostCard from "@/components/PostCard";
import { PostData, timeFormatter } from "@/templates/PostProps";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button";
import { Statuser } from "@/components/VerificationComponent";
import { ArrowLeft, Cake, Ellipsis, Link, Pin } from "lucide-react";
import LeftSideBar from "@/components/LeftSideBar";
import ContentSection from "./ContentTabs";
import { useUser } from "../providers/UserProvider";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";

export default function Profile({ userData, userPostCard }: { userData: UserSchema, userPostCard: PostData[] }) {
    const router = useRouter();
    const {userdata, loading} = useUser();
    const navigate = useNavigateWithHistory();

    if (!userData) {
        notFound();
    }

    return (
        <div className="w-full flex h-screen max-h-screen dark:bg-black overflow-auto">
            <div className="md:w-3/5 h-screen max-h-screen dark:bg-black overflow-auto">
                <div className={`flex backdrop-blur-lg top-0 sticky gap-4 items-center z-10 w-full px-3 py-2`}>
                    <ArrowLeft 
                    onClick={() => navigate()}
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
                            <AvatarImage className="w-full h-full rounded-none object-cover aspect-auto" src={userData.coverPhoto} />
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

                    <div className="absolute -top-4 right-4 flex items-center gap-2">
                        {userData._id as unknown as string !== userdata._id && (
                            <div className="rounded-full p-1 border-2 bg-white dark:bg-black border-white dark:border-black/85 overflow-hidden">
                                <Ellipsis className="size-6" />
                            </div>
                        )}
                        <div className="rounded-full border-2 border-white dark:border-black overflow-hidden">
                            {userData._id as unknown as string === userdata._id ?
                            <Button onClick={() => router.push(`/${userData.username}/edit`)} className="px-4 py-2 bg-brand/90 text-white rounded-full hover:bg-brand/80">
                                Edit profile
                            </Button> :
                            <Button className="px-4 py-2 bg-brand/90 text-white rounded-full hover:bg-brand/80">
                                Follow
                            </Button>
                            }
                        </div>
                    </div>

                    {/* Profile Info */}
                    <div className="pt-16 pb-2">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="flex items-center gap-1">
                                    <h1 className="text-xl font-bold dark:text-white">{userData.name}</h1>
                                    {userData.verified && (
                                        <Statuser className="size-4"/>
                                    )}
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">@{userData.username}</p>
                            </div>
                        </div>

                        {/* Bio & Stats */}
                        {userData.bio && (
                            <p className="text-gray-800 dark:text-gray-200">{userData.bio}</p>
                        )}
                        <div className="flex gap-4 flex-wrap">
                            {userData.location && (
                                <span className="text-gray-600 dark:text-gray-400 !ml-0 flex items-center gap-1"><Pin className="size-4" /> {userData.location}</span>
                            )}
                            {userData.dob && (
                                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1"><Cake className="size-4" /> {timeFormatter(new Date(userData.dob).toISOString(), false)}</span>
                            )}
                            {userData.website && (
                                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    <Link className="size-4" />
                                    <a href={userData.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                        {userData.website.replace("https://", "")}
                                    </a>
                                </span>
                            )}
                        </div>
                        {/* Stats */}
                        <div className="flex gap-6 text-gray-600 dark:text-gray-400">
                            <span>{userData.followers?.length || 0} followers</span>
                            <span>{userData.following?.length || 0} following</span>
                            <span>{userPostCard.length} posts</span>
                        </div>
                    </div>
                </div>
                <ContentSection posts={userPostCard}/>
            </div>

            <LeftSideBar />
        </div>
    );
}