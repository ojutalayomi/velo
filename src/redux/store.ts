// redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import navigationReducer from './navigationSlice';
import signupsReducer from './signupSlice';
import userReducer from './userSlice';
import chatReducer from './chatSlice';

// Define RootState and AppDispatch types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const store = configureStore({
  reducer: {
    navigation: navigationReducer,
    signups: signupsReducer,
    user: userReducer,
    chat: chatReducer,
  },
});