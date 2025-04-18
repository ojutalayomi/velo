import { configureStore } from '@reduxjs/toolkit';
import navigationReducer from './navigationSlice';
import signupsReducer from './signupSlice';
import userReducer from './userSlice';
import chatReducer from './chatSlice';
import rtcReducer from './rtcSlice';
import postsReducer from './postsSlice';
import utilReducer from './utilsSlice';
import routeReducer from './routeSlice';

// Define RootState and AppDispatch types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    navigation: navigationReducer,
    posts: postsReducer,
    rtc: rtcReducer,
    signups: signupsReducer,
    user: userReducer,
    utils: utilReducer,
    route: routeReducer,
  },
});