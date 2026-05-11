import type { PaginationMeta } from "@/lib/apiPagination";
import { PostSchema } from "@/lib/types/type";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FollowingFeedState {
  posts: PostSchema[];
  loading: boolean;
  error: string | null;
  feedNextSkip: number;
  feedHasMore: boolean;
  feedLoadingMore: boolean;
}

const initialState: FollowingFeedState = {
  posts: [],
  loading: true,
  error: null,
  feedNextSkip: 0,
  feedHasMore: false,
  feedLoadingMore: false,
};

function postKey(p: PostSchema) {
  return String(p.PostID ?? p._id);
}

const followingFeedSlice = createSlice({
  name: "followingFeed",
  initialState,
  reducers: {
    initFollowingFeedPage: (
      state,
      action: PayloadAction<{ posts: PostSchema[]; pagination: PaginationMeta }>
    ) => {
      state.posts = action.payload.posts;
      const p = action.payload.pagination;
      state.feedNextSkip = p.skip + p.limit;
      state.feedHasMore = p.hasMore;
      state.feedLoadingMore = false;
    },
    appendFollowingFeedPage: (
      state,
      action: PayloadAction<{ posts: PostSchema[]; pagination: PaginationMeta }>
    ) => {
      const seen = new Set(state.posts.map(postKey));
      for (const post of action.payload.posts) {
        const k = postKey(post);
        if (!seen.has(k)) {
          seen.add(k);
          state.posts.push(post);
        }
      }
      const p = action.payload.pagination;
      state.feedNextSkip = p.skip + p.limit;
      state.feedHasMore = p.hasMore;
      state.feedLoadingMore = false;
    },
    setFollowingFeedLoadingMore: (state, action: PayloadAction<boolean>) => {
      state.feedLoadingMore = action.payload;
    },
    setFollowingLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setFollowingError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    updateFollowingFeedPosts: (
      state,
      action: PayloadAction<{ key: keyof PostSchema; value: string; updates: Partial<PostSchema> }>
    ) => {
      const { key, value, updates } = action.payload;
      state.posts = state.posts.map((post) => {
        if (post[key as keyof PostSchema] === value) {
          return { ...post, ...updates };
        }
        return post;
      });
    },
  },
});

export const {
  initFollowingFeedPage,
  appendFollowingFeedPage,
  setFollowingFeedLoadingMore,
  setFollowingLoading,
  setFollowingError,
  updateFollowingFeedPosts,
} = followingFeedSlice.actions;

export default followingFeedSlice.reducer;
