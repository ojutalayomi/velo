import { getUser, getUserPosts } from "./action";
import { UserData } from "@/lib/types/type";
import { PostSchema } from '@/lib/types/type';
import Profile from "./clientComps";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const userData: UserData = await getUser((await params).username);
    const userPosts: PostSchema[] = await getUserPosts((await params).username);

    return <Profile profileData={userData} profilePostCards={userPosts}/>
}