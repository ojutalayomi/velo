import { getUser, getUserPosts } from "./action";
import Profile from "./clientComps";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const userData = await getUser((await params).username);
  const userPosts = await getUserPosts((await params).username);

  return <Profile profileData={userData} profilePostCards={userPosts} />;
}
