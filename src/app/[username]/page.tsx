import type { PaginationMeta } from "@/lib/apiPagination";
import { DEFAULT_POST_LIMIT } from "@/lib/apiPagination";

import { getProfilePostsFirstPage, getUser } from "./action";
import Profile from "./clientComps";

const defaultPagination: PaginationMeta = {
  skip: 0,
  limit: DEFAULT_POST_LIMIT,
  hasMore: false,
};

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const username = (await params).username;
  const userData = await getUser(username);
  const bundle = await getProfilePostsFirstPage(username);

  return (
    <Profile
      profileData={userData}
      profilePostCards={bundle.posts}
      postsPagination={bundle.pagination ?? defaultPagination}
    />
  );
}
