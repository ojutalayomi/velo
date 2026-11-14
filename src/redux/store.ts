import { configureStore } from "@reduxjs/toolkit";
import { useDispatch as useReduxDispatch } from "react-redux";

import chatReducer from "./chatSlice";
import followingFeedReducer from "./followingFeedSlice";
import navigationReducer from "./navigationSlice";
import notificationReducer from "./notificationSlice";
import postsReducer from "./postsSlice";
import routeReducer from "./routeSlice";
import rtcReducer from "./rtcSlice";
import signupsReducer from "./signupSlice";
import statusReducer from "./statusSlice";
import userReducer from "./userSlice";
import utilReducer from "./utilsSlice";


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
    followingFeed: followingFeedReducer,
    status: statusReducer,
    notifications: notificationReducer,
  },
});

// Proper React hook for typed dispatch
export const useDispatch: () => AppDispatch = useReduxDispatch;
