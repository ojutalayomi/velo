import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useSelector, useStore } from "react-redux";

import type { PaginationMeta } from "@/lib/apiPagination";
import { loadFeed, saveFeed } from "@/lib/feedCache";
import { fetchFollowingPostsPage, fetchPostsPage, fetchStatusPage } from "@/lib/getStatus";
import { networkMonitor } from "@/lib/network";
import type { ClientPostSchema } from "@/lib/types/type";
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
  const [online, setOnline] = useState(false);
  const onlineRef = useRef(false);
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const userId = useSelector((s: RootState) => s.user.userdata._id);
  const userIdRef = useRef(userId);
  // The latest page from the server per feed, kept until a user id is known to save it under.
  const fresh = useRef<{
    forYou?: { data: ClientPostSchema[]; pagination: PaginationMeta };
    following?: { data: ClientPostSchema[]; pagination: PaginationMeta };
    status?: { data: string[]; pagination: PaginationMeta };
  }>({});
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

  // Follow the connection, not just its state at load: a page opened offline must load the feeds
  // once the network returns.
  useEffect(
    () =>
      networkMonitor.subscribe((status) => {
        onlineRef.current = status.online;
        setOnline(status.online);
      }),
    []
  );

  // Show the saved feeds at once (and offline), then let the fresh load below replace them.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const [forYou, following, status] = await Promise.all([
        loadFeed<ClientPostSchema>("forYou", userId),
        loadFeed<ClientPostSchema>("following", userId),
        loadFeed<string>("status", userId),
      ]);
      if (cancelled) return;
      const state = store.getState();
      if (forYou && state.posts.posts.length === 0) {
        dispatch(initFeedPage({ posts: forYou.data, pagination: forYou.pagination }));
        dispatch(setLoading(false));
      }
      if (following && state.followingFeed.posts.length === 0) {
        dispatch(initFollowingFeedPage({ posts: following.data, pagination: following.pagination }));
        dispatch(setFollowingLoading(false));
      }
      if (status) {
        setSuccess((prev) => prev ?? status.data);
        setAvatarNextSkip((prev) => prev || status.pagination.skip + status.pagination.limit);
        setAvatarsHasMore((prev) => prev || status.pagination.hasMore);
      }
      // Offline with nothing saved: say so instead of loading forever.
      if (!onlineRef.current) {
        if (!forYou && state.posts.posts.length === 0) {
          dispatch(setLoading(false));
          dispatch(setError("You're offline"));
        }
        if (!following && state.followingFeed.posts.length === 0) {
          dispatch(setFollowingLoading(false));
          dispatch(setFollowingError("You're offline"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, dispatch, store]);

  // Save what the server sent as soon as it is known whose it is.
  useEffect(() => {
    userIdRef.current = userId;
    if (!userId) return;
    const { forYou, following, status } = fresh.current;
    if (forYou) void saveFeed("forYou", userId, forYou.data, forYou.pagination);
    if (following) void saveFeed("following", userId, following.data, following.pagination);
    if (status) void saveFeed("status", userId, status.data, status.pagination);
  }, [userId]);

  // For You feed initial load
  useEffect(() => {
    if (!online) return;

    let cancelled = false;

    const run = async () => {
      // Keep showing the saved feed while the fresh one loads.
      if (store.getState().posts.posts.length === 0) dispatch(setLoading(true));

      try {
        const [statusPage, postsPage] = await Promise.all([fetchStatusPage(0), fetchPostsPage(0)]);

        if (cancelled) return;

        setSuccess(statusPage.data);
        setAvatarNextSkip(statusPage.pagination.skip + statusPage.pagination.limit);
        setAvatarsHasMore(statusPage.pagination.hasMore);

        dispatch(initFeedPage({ posts: postsPage.data, pagination: postsPage.pagination }));
        dispatch(setError(null));

        fresh.current.forYou = { data: postsPage.data, pagination: postsPage.pagination };
        fresh.current.status = { data: statusPage.data, pagination: statusPage.pagination };
        if (userIdRef.current) {
          void saveFeed("forYou", userIdRef.current, postsPage.data, postsPage.pagination);
          void saveFeed("status", userIdRef.current, statusPage.data, statusPage.pagination);
        }
      } catch (error) {
        // Keep the saved feed on screen if the refresh fails (a weak or dropped connection).
        if (!cancelled && store.getState().posts.posts.length === 0) {
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
  }, [reload, online, dispatch, store]);

  // Following feed initial load
  useEffect(() => {
    if (!online) return;

    let cancelled = false;

    const run = async () => {
      if (store.getState().followingFeed.posts.length === 0) dispatch(setFollowingLoading(true));

      try {
        const postsPage = await fetchFollowingPostsPage(0);
        if (cancelled) return;
        dispatch(
          initFollowingFeedPage({ posts: postsPage.data, pagination: postsPage.pagination })
        );
        dispatch(setFollowingError(null));

        fresh.current.following = { data: postsPage.data, pagination: postsPage.pagination };
        if (userIdRef.current) {
          void saveFeed("following", userIdRef.current, postsPage.data, postsPage.pagination);
        }
      } catch (error) {
        if (!cancelled && store.getState().followingFeed.posts.length === 0) {
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
  }, [followingReload, online, dispatch, store]);

  const loadMoreFeed = useCallback(async () => {
    if (!feedHasMore || feedLoadingMore || !online) return;
    dispatch(setFeedLoadingMore(true));
    try {
      const postsPage = await fetchPostsPage(feedNextSkip);
      dispatch(appendFeedPage({ posts: postsPage.data, pagination: postsPage.pagination }));
    } catch (error) {
      dispatch(setError((error as Error).message));
      dispatch(setFeedLoadingMore(false));
    }
  }, [dispatch, feedHasMore, feedLoadingMore, feedNextSkip, online]);

  const loadMoreFollowing = useCallback(async () => {
    if (!followingFeedHasMore || followingFeedLoadingMore || !online) return;
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
    online,
  ]);

  const loadMoreAvatars = useCallback(async () => {
    if (!avatarsHasMore || avatarsLoadingMore || !online) return;
    setAvatarsLoadingMore(true);
    try {
      const page = await fetchStatusPage(avatarNextSkip);
      setSuccess((prev) => [...(prev ?? []), ...page.data]);
      setAvatarNextSkip(page.pagination.skip + page.pagination.limit);
      setAvatarsHasMore(page.pagination.hasMore);
    } finally {
      setAvatarsLoadingMore(false);
    }
  }, [avatarNextSkip, avatarsHasMore, avatarsLoadingMore, online]);

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
