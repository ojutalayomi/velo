import { getUser, getUserPosts } from "./action";
import { UserSchema } from "@/lib/types/type";
import { PostData } from "@/templates/PostProps";
import Profile from "./clientComps";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const userData: UserSchema = await getUser((await params).username);
    const userPosts: PostData[] = await getUserPosts((await params).username);

    return <Profile userData={userData} userPostCard={userPosts}/>
}