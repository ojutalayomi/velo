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
}

const initialState: UtilsState = {
  toggleDialog: false,
  toggleMediaDialog: false,
  selectedMessages: [],
};

const utilSlice = createSlice({
  name: 'utils',
  initialState,
  reducers: {
    setToggleDialog: (state, action: PayloadAction<boolean>) => {
      state.toggleDialog = action.payload;
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
    removeSelectedMessage: (state, action: PayloadAction<string>) => {
      state.selectedMessages = state.selectedMessages.filter(msg => msg !== action.payload);
    },
    clearSelectedMessages: (state) => {
      state.selectedMessages = [];
    },
  },
});

export const { setToggleDialog, setToggleMediaDialog, setSelectedMessages, addSelectedMessage, removeSelectedMessage, clearSelectedMessages } = utilSlice.actions;
export default utilSlice.reducer;