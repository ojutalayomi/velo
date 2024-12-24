import { PostData } from '@/templates/PostProps';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PostsState {
  posts: PostData[];
  loading: boolean;
  error: string | null;
}

const initialState: PostsState = {
  posts: [],
  loading: false,
  error: null
};

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    setPosts: (state, action: PayloadAction<PostData[]>) => {
      state.posts = action.payload;
    },
    addPost: (state, action: PayloadAction<PostData>) => {
      state.posts.unshift(action.payload);
    },
    updatePost: (state, action: PayloadAction<{id: string, updates: Partial<PostData>}>) => {
      const index = state.posts.findIndex(post => post._id === action.payload.id);
      if (index !== -1) {
        state.posts[index] = { ...state.posts[index], ...action.payload.updates };
      }
    },
    deletePost: (state, action: PayloadAction<string>) => {
      state.posts = state.posts.filter(post => post._id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  }
});

export const { setPosts, addPost, updatePost, deletePost, setLoading, setError } = postsSlice.actions;

export default postsSlice.reducer;
