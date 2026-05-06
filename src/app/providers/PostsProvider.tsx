import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useSelector } from "react-redux";

import { fetchFollowingPostsPage, fetchPostsPage, fetchStatusPage } from "@/lib/getStatus";
import { NetworkStatus, networkMonitor } from "@/lib/network";
import {
  appendFollowingFeedPage,
  initFollowingFeedPage,
  setFollowingError,
  setFollowingFeedLoadingMore,
  setFollowingLoading,
} from "@/redux/followingFeedSlice";
import { useAppDispatch } from "@/redux/hooks";
import {
  appendFeedPage,
  initFeedPage,
  setFeedLoadingMore,
  setLoading,
  setError,
} from "@/redux/postsSlice";
import { RootState } from "@/redux/store";

type PostsCtx = {
  success: string[] | null;
  setReload: React.Dispatch<React.SetStateAction<boolean>>;
  setFollowingReload: React.Dispatch<React.SetStateAction<boolean>>;
  loadMoreFeed: () => Promise<void>;
  loadMoreFollowing: () => Promise<void>;
  loadMoreAvatars: () => Promise<void>;
  avatarsLoadingMore: boolean;
  avatarsHasMore: boolean;
};

const PostsContext = createContext<PostsCtx | undefined>(undefined);

const PostsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [network, setNetwork] = useState<NetworkStatus>();
  const dispatch = useAppDispatch();
  const [success, setSuccess] = useState<string[] | null>(null);
  const [reload, setReload] = useState<boolean>(false);
  const [followingReload, setFollowingReload] = useState<boolean>(false);
  const [avatarsLoadingMore, setAvatarsLoadingMore] = useState(false);
  const [avatarNextSkip, setAvatarNextSkip] = useState(0);
  const [avatarsHasMore, setAvatarsHasMore] = useState(false);

  // For You feed selectors
  const feedHasMore = useSelector((s: RootState) => s.posts.feedHasMore);
  const feedLoadingMore = useSelector((s: RootState) => s.posts.feedLoadingMore);
  const feedNextSkip = useSelector((s: RootState) => s.posts.feedNextSkip);

  // Following feed selectors
  const followingFeedHasMore = useSelector((s: RootState) => s.followingFeed.feedHasMore);
  const followingFeedLoadingMore = useSelector((s: RootState) => s.followingFeed.feedLoadingMore);
  const followingFeedNextSkip = useSelector((s: RootState) => s.followingFeed.feedNextSkip);

  useEffect(() => {
    setNetwork(networkMonitor.getNetworkStatus());
  }, []);

  // For You feed initial load
  useEffect(() => {
    if (!network?.online) return;

    let cancelled = false;

    const run = async () => {
      dispatch(setLoading(true));

      try {
        const [statusPage, postsPage] = await Promise.all([fetchStatusPage(0), fetchPostsPage(0)]);

        if (cancelled) return;

        setSuccess(statusPage.data);
        setAvatarNextSkip(statusPage.pagination.skip + statusPage.pagination.limit);
        setAvatarsHasMore(statusPage.pagination.hasMore);

        dispatch(initFeedPage({ posts: postsPage.data, pagination: postsPage.pagination }));
        dispatch(setError(null));
      } catch (error) {
        if (!cancelled) {
          dispatch(setError((error as Error).message));
        }
      } finally {
        if (!cancelled) {
          dispatch(setLoading(false));
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [reload, network, dispatch]);

  // Following feed initial load
  useEffect(() => {
    if (!network?.online) return;

    let cancelled = false;

    const run = async () => {
      dispatch(setFollowingLoading(true));

      try {
        const postsPage = await fetchFollowingPostsPage(0);
        if (cancelled) return;
        dispatch(
          initFollowingFeedPage({ posts: postsPage.data, pagination: postsPage.pagination })
        );
        dispatch(setFollowingError(null));
      } catch (error) {
        if (!cancelled) {
          dispatch(setFollowingError((error as Error).message));
        }
      } finally {
        if (!cancelled) {
          dispatch(setFollowingLoading(false));
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [followingReload, network, dispatch]);

  const loadMoreFeed = useCallback(async () => {
    if (!feedHasMore || feedLoadingMore || !network?.online) return;
    dispatch(setFeedLoadingMore(true));
    try {
      const postsPage = await fetchPostsPage(feedNextSkip);
      dispatch(appendFeedPage({ posts: postsPage.data, pagination: postsPage.pagination }));
    } catch (error) {
      dispatch(setError((error as Error).message));
      dispatch(setFeedLoadingMore(false));
    }
  }, [dispatch, feedHasMore, feedLoadingMore, feedNextSkip, network?.online]);

  const loadMoreFollowing = useCallback(async () => {
    if (!followingFeedHasMore || followingFeedLoadingMore || !network?.online) return;
    dispatch(setFollowingFeedLoadingMore(true));
    try {
      const postsPage = await fetchFollowingPostsPage(followingFeedNextSkip);
      dispatch(
        appendFollowingFeedPage({ posts: postsPage.data, pagination: postsPage.pagination })
      );
    } catch (error) {
      dispatch(setFollowingError((error as Error).message));
      dispatch(setFollowingFeedLoadingMore(false));
    }
  }, [
    dispatch,
    followingFeedHasMore,
    followingFeedLoadingMore,
    followingFeedNextSkip,
    network?.online,
  ]);

  const loadMoreAvatars = useCallback(async () => {
    if (!avatarsHasMore || avatarsLoadingMore || !network?.online) return;
    setAvatarsLoadingMore(true);
    try {
      const page = await fetchStatusPage(avatarNextSkip);
      setSuccess((prev) => [...(prev ?? []), ...page.data]);
      setAvatarNextSkip(page.pagination.skip + page.pagination.limit);
      setAvatarsHasMore(page.pagination.hasMore);
    } finally {
      setAvatarsLoadingMore(false);
    }
  }, [avatarNextSkip, avatarsHasMore, avatarsLoadingMore, network?.online]);

  return (
    <PostsContext.Provider
      value={{
        success,
        setReload,
        setFollowingReload,
        loadMoreFeed,
        loadMoreFollowing,
        loadMoreAvatars,
        avatarsLoadingMore,
        avatarsHasMore,
      }}
    >
      {children}
    </PostsContext.Provider>
  );
};

export default PostsProvider;

export const usePosts = () => {
  const context = useContext(PostsContext);
  if (context === undefined) {
    throw new Error("usePosts must be used within a PostsProvider");
  }
  return context;
};
