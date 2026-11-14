import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface NotificationState {
  unreadCount: number;
}

const initialState: NotificationState = {
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setUnreadCount: (state, action: PayloadAction<number>) => {
      const value = Number(action.payload);
      state.unreadCount = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    },
    resetUnread: (state) => {
      state.unreadCount = 0;
    },
  },
});

export const { setUnreadCount, resetUnread } = notificationSlice.actions;

export default notificationSlice.reducer;
