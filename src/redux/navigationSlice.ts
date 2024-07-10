// redux/navigationSlice.ts
import { createSlice } from '@reduxjs/toolkit';

const navigationSlice = createSlice({
  name: 'navigation',
  initialState: {
    activeRoute: 'home',
    isMoreShown: false,
  },
  reducers: {
    setActiveRoute: (state, action) => {
      state.activeRoute = action.payload;
    },
    setMoreStatus: (state, action) => {
      state.isMoreShown = action.payload;
    },
  },
});

export const { setActiveRoute, setMoreStatus } = navigationSlice.actions;
export default navigationSlice.reducer;