// redux/navigationSlice.ts
import { createSlice } from '@reduxjs/toolkit';

const navigationSlice = createSlice({
  name: 'navigation',
  initialState: {
    activeRoute: typeof window !== 'undefined' ? window.location.pathname.replace('/','') : 'home',
    isMoreShown: false,
    chaT: false,
  },
  reducers: {
    setActiveRoute: (state, action) => {
      state.activeRoute = action.payload;
    },
    setMoreStatus: (state, action) => {
      state.isMoreShown = action.payload;
    },
    showChat: (state, action) => {
      state.chaT = action.payload;
    }
  },
});

export const { setActiveRoute, setMoreStatus, showChat } = navigationSlice.actions;
export default navigationSlice.reducer;