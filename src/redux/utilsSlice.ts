// utilsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
  toggleMediaDialog: boolean,
  selectedMessages: string[];
  onlineUsers: string[]
}

const initialState: UtilsState = {
  toggleDialog: false,
  toggleMediaDialog: false,
  selectedMessages: [],
  onlineUsers: []
};

const utilSlice = createSlice({
  name: 'utils',
  initialState,
  reducers: {
    setToggleDialog: (state, action: PayloadAction<boolean>) => {
      state.toggleDialog = action.payload;
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
      if (state.onlineUsers.includes(action.payload)) return
      state.onlineUsers.push(action.payload);
    },
    removeSelectedMessage: (state, action: PayloadAction<string>) => {
      state.selectedMessages = state.selectedMessages.filter(msg => msg !== action.payload);
    },
    removeOnlineUser: (state, action: PayloadAction<string>) => {
      state.onlineUsers = state.onlineUsers.filter(user => user !== action.payload);
    },
    clearSelectedMessages: (state) => {
      state.selectedMessages = [];
    },
    clearOnlineUsers: (state) => {
      state.onlineUsers = [];
    }
  },
});

export const { setToggleDialog, setOnlineUsers, setToggleMediaDialog, setSelectedMessages, addSelectedMessage, addOnlineUser, removeSelectedMessage, removeOnlineUser, clearSelectedMessages, clearOnlineUsers } = utilSlice.actions;
export default utilSlice.reducer;