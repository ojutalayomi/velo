// utilsSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface SerializableFile extends Partial<Blob> {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  lastModified: number;
}

interface UtilsState {
  toggleDialog: boolean;
  toggleMediaDialog: boolean;
  selectedMessages: string[];
  onlineUsers: string[];
  /** A group message the person chose to answer in private, waiting for the chat page to pick it up. */
  pendingPrivateReply: PendingPrivateReply | null;
}

export interface PendingPrivateReply {
  /** The group message being answered. */
  messageId: string;
  /** The chat page it is for: a DM id, or `new:<userId>` when there is no DM yet. */
  target: string;
}

const initialState: UtilsState = {
  toggleDialog: false,
  toggleMediaDialog: false,
  selectedMessages: [],
  onlineUsers: [],
  pendingPrivateReply: null,
};

const utilSlice = createSlice({
  name: "utils",
  initialState,
  reducers: {
    setToggleDialog: (state, action: PayloadAction<boolean>) => {
      state.toggleDialog = action.payload;
    },
    setPendingPrivateReply: (state, action: PayloadAction<PendingPrivateReply | null>) => {
      state.pendingPrivateReply = action.payload;
    },
    setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      state.onlineUsers = action.payload;
    },
    setToggleMediaDialog: (state, action: PayloadAction<boolean>) => {
      state.toggleMediaDialog = action.payload;
    },
    setSelectedMessages: (state, action: PayloadAction<string[]>) => {
      state.selectedMessages = action.payload;
    },
    addSelectedMessage: (state, action: PayloadAction<string>) => {
      state.selectedMessages.push(action.payload);
    },
    addOnlineUser: (state, action: PayloadAction<string>) => {
      if (state.onlineUsers.includes(action.payload)) return;
      state.onlineUsers.push(action.payload);
    },
    removeSelectedMessage: (state, action: PayloadAction<string>) => {
      state.selectedMessages = state.selectedMessages.filter((msg) => msg !== action.payload);
    },
    removeOnlineUser: (state, action: PayloadAction<string>) => {
      state.onlineUsers = state.onlineUsers.filter((user) => user !== action.payload);
    },
    clearSelectedMessages: (state) => {
      state.selectedMessages = [];
    },
    clearOnlineUsers: (state) => {
      state.onlineUsers = [];
    },
  },
});

export const {
  setToggleDialog,
  setOnlineUsers,
  setPendingPrivateReply,
  setToggleMediaDialog,
  setSelectedMessages,
  addSelectedMessage,
  addOnlineUser,
  removeSelectedMessage,
  removeOnlineUser,
  clearSelectedMessages,
  clearOnlineUsers,
} = utilSlice.actions;
export default utilSlice.reducer;
