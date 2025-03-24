'use client'
import { notFound, useRouter } from "next/navigation";
import { UserSchema } from "@/lib/types/type";
import PostCard from "@/components/posts";
import { PostData } from "@/templates/PostProps";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Statuser } from "@/components/VerificationComponent";
import Image from "next/image";
import { ArrowLeft, Ellipsis, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Footer } from "@/components/Footer";

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
                    onClick={() => router.back()}
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
            <div className="min-h-screen hidden md:block flex-1 dark:bg-zinc-900 dark:text-slate-200 bg-gray-50">
                <div className="max-w-md max-h-full mx-auto overflow-auto space-y-4">
                {/* Search Bar */}
                    <div className="dark:bg-zinc-900 bg-gray-50 px-4 py-2 sticky top-0 w-full z-10">
                        <div className='relative'>
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <Input
                            type="text"
                            placeholder="Search people"
                            className="w-full bg-white dark:bg-zinc-800 border-0 shadow-sm rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand/20"
                        />
                        </div>
                    </div>

                    {/* Suggestions Section */}
                    <div className="bg-white dark:bg-zinc-800 mx-4 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold">Suggested for you</h2>
                            <a href="#" className="text-brand text-sm hover:text-brand/80 transition-colors">
                                See All
                            </a>
                        </div>

                        <div className="space-y-4">
                        {['lizboldempire', 'w_u_m_h_y', 'ubochiomannie', 'itzqueenhanu', 'salakoadenikeomolara'].map((username, index) => (
                            <div key={username} className="flex gap-3 items-center justify-between group">
                                <div className="relative">
                                    <Image 
                                    src="/default.jpeg" 
                                    alt={username} 
                                    height={40} 
                                    width={40} 
                                    className="rounded-full object-cover"
                                    />
                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-800"></div>
                                </div>
                                <div className='flex-1 overflow-auto'>
                                    <div>
                                    <p className="font-medium text-sm truncate">{username}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {index === 3 ? 'New to Velo' : 'Suggested for you'}
                                    </p>
                                    </div>
                                </div>
                                <Button variant={"link"} className="text-brand text-sm font-medium hover:text-brand/80 transition-colors">
                                    Follow
                                </Button>
                            </div>
                        ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 mx-4 rounded-xl p-4 shadow-sm">
                        <h1 className="text-lg font-bold mb-4">What&apos;s happening</h1>
                    
                        <div className="space-y-2">
                            <div className="group cursor-pointer rounded-xl p-2 transition-all duration-200 relative">
                                <p className="text-gray-500 text-sm">Trending in Nigeria</p>
                                <p className="text-sm font-bold my-1">Kanye</p>
                                <p className="text-gray-500 text-xs">5.69M posts</p>
                                <button className="absolute top-1/2 transform -translate-y-1/2 right-4 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-400 transition-opacity duration-200">
                                    <span className="sr-only">more_horiz</span>
                                    <Ellipsis size={25} className="cursor-pointer dark:text-gray-400" />
                                </button>
                            </div>
                    
                            <div className="group cursor-pointer rounded-xl p-2 transition-all duration-200 relative">
                                <p className="text-gray-500 text-sm">Trending in Nigeria</p>
                                <p className="text-sm font-bold my-1">Montoya</p>
                                <p className="text-gray-500 text-xs">360K posts</p>
                                <button className="absolute top-1/2 transform -translate-y-1/2 right-4 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-400 transition-opacity duration-200">
                                    <span className="sr-only">more_horiz</span>
                                    <Ellipsis size={25} className="cursor-pointer dark:text-gray-400" />
                                </button>
                            </div>
                    
                            <div className="group cursor-pointer rounded-xl p-2 transition-all duration-200 relative">
                                <p className="text-gray-500 text-sm">Trending in Nigeria</p>
                                <p className="text-sm font-bold my-1">Futures</p>
                                <p className="text-gray-500 text-xs">38.5K posts</p>
                                <button className="absolute top-1/2 transform -translate-y-1/2 right-4 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-400 transition-opacity duration-200">
                                    <span className="sr-only">more_horiz</span>
                                    <Ellipsis size={25} className="cursor-pointer dark:text-gray-400" />
                                </button>
                            </div>
                    
                            <div className="group cursor-pointer rounded-xl p-2 transition-all duration-200 relative">
                                <p className="text-gray-500 text-sm">Trending in Nigeria</p>
                                <p className="text-sm font-bold my-1">Cashout</p>
                                <p className="text-gray-500 text-xs">2,584 posts</p>
                                <button className="absolute top-1/2 transform -translate-y-1/2 right-4 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-400 transition-opacity duration-200">
                                    <span className="sr-only">more_horiz</span>
                                    <Ellipsis size={25} className="cursor-pointer dark:text-gray-400" />
                                </button>
                            </div>
                    
                            <button className="text-brand hover:text-brand/80 p-3 rounded-xl transition-all duration-200 w-full text-left">
                                Show more
                            </button>
                        </div>
                    </div> 

                    {/* Footer */}
                    <Footer />
                </div>
            </div>
        </div>
    );
}