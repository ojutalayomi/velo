import { notFound } from "next/navigation";
import ImageDiv from "@/components/imageDiv";
import MediaSlide from "@/templates/mediaSlides";
import { getUser, getUserPosts } from "./action";
import { PostSchema, UserSchema } from "@/lib/types/type";
import Posts from "@/templates/posts";
import { PostData } from "@/templates/PostProps";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button";

export default async function Profile({ params }: { params: Promise<{ username: string }> }) {
    const userData: UserSchema = await getUser((await params).username);
    const userPosts: PostData[] = await getUserPosts((await params).username);
    const hostname = 'https://s3.amazonaws.com/post-s/';

    if (!userData) {
        notFound();
    }

    return (
        <div className="w-full h-screen max-h-screen dark:bg-black overflow-auto">
            {/* Cover Photo */}
            <div className="h-48 w-full bg-gray-200 dark:bg-gray-800 relative">
                {userData.coverPhoto && (
                    <Avatar className="h-full w-full object-cover">
                        <AvatarImage className="w-full h-full" src={hostname+userData.coverPhoto} />
                        <AvatarFallback className="w-full h-full">
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
                            <AvatarImage className="w-full h-full" src={hostname+userData.displayPicture} />
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
                                    <img 
                                        src="/verified.svg"
                                        alt="Verified"
                                        className="w-6 h-6"
                                    />
                                )}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400">@{userData.username}</p>
                        </div>
                        <Button className="px-4 py-2 bg-brand/90 text-white rounded-full hover:bg-brand/80">
                            Follow
                        </Button>
                    </div>

                    {/* Bio & Stats */}
                    {userData.bio && (
                        <p className="text-gray-800 dark:text-gray-200 mb-4">{userData.bio}</p>
                    )}
                    <div className="flex gap-6 text-gray-600 dark:text-gray-400">
                        <span>{userData.followers?.length || 0} followers</span>
                        <span>{userData.following?.length || 0} following</span>
                        <span>{userPosts.length} posts</span>
                    </div>
                </div>

                {/* Posts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userPosts.map((post, index) => (
                        <div key={post.PostID + index} className={`${post.Image.length ? 'aspect-square' : ''} w-full h-fit rounded-xl bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow`}>
                            {post.Image.length ? <MediaSlide postData={post} isLink={true} /> : <Posts postData={post} />}    
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}