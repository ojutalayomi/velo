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
  attachments: SerializableFile[];
}

const initialState: UtilsState = {
  toggleDialog: false,
  attachments: [],
};

const utilSlice = createSlice({
  name: 'utils',
  initialState,
  reducers: {
    setToggleDialog: (state, action: PayloadAction<boolean>) => {
      state.toggleDialog = action.payload;
    },
    setAttachments: (state, action: PayloadAction<SerializableFile[]>) => {
      state.attachments = action.payload;
    },
    addAttachment: (state, action: PayloadAction<SerializableFile>) => {
      state.attachments.push(action.payload);
    },
    removeAttachment: (state, action: PayloadAction<string>) => {
      state.attachments = state.attachments.filter(file => file.id !== action.payload);
    },
    clearAttachments: (state) => {
      state.attachments = [];
    },
  },
});

export const { setToggleDialog, setAttachments, addAttachment, removeAttachment, clearAttachments } = utilSlice.actions;
export default utilSlice.reducer;