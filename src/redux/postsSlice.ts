import { Post } from '@/templates/PostProps';
import { PostSchema } from '@/lib/types/type';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PostsState {
  posts: PostSchema[];
  loading: boolean;
  error: string | null;
  postPreview: Post
}

const initialState: PostsState = {
  posts: [],
  loading: true,
  error: null,
  postPreview: {} as Post
};

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    setPosts: (state, action: PayloadAction<PostSchema[]>) => {
      state.posts = action.payload;
    },
    addPost: (state, action: PayloadAction<PostSchema>) => {
      if(!state.posts.some(post => post._id === action.payload._id)) {
        state.posts.unshift(action.payload);
      }
    },
    updatePost: (state, action: PayloadAction<{id: string, updates: Partial<PostSchema>}>) => {
      const index = state.posts.findIndex(post => post.PostID === action.payload.id);
      if (index !== -1) {
        state.posts[index] = { ...state.posts[index], ...action.payload.updates };
      }
    },
    updatePosts: (state, action: PayloadAction<{key: keyof PostSchema, value: string, updates: Partial<PostSchema>}>) => {
      const { key, value, updates } = action.payload;
      state.posts = state.posts.map(post => {
        if (post[key as keyof PostSchema] === value) {
          return { ...post, ...updates };
        }
        return post;
      });
    },
    deletePost: (state, action: PayloadAction<string>) => {
      state.posts = state.posts.filter(post => post._id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setPostPreview: (state, action: PayloadAction<Post>) => {
      state.postPreview = action.payload;
    },
    updatePostPreview: (state, action: PayloadAction<Partial<Post['post']>>) => {
      if (state.postPreview) {
        const update = action.payload;
        state.postPreview = {
          ...state.postPreview,
          post: {
            ...state.postPreview.post,
            ...update
          }
        };
      }
    },
    clearPostPreview: (state) => {
      state.postPreview = {} as Post;
    }
  }
});

export const { setPosts, addPost, updatePost, updatePosts, deletePost, setLoading, setError, setPostPreview, updatePostPreview, clearPostPreview } = postsSlice.actions;

export default postsSlice.reducer;
