import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface RouteState {
  history: string[];
}

const initialState: RouteState = {
  history: [],
};

const routeSlice = createSlice({
  name: "route",
  initialState,
  reducers: {
    addRoute: (state, action: PayloadAction<string>) => {
      state.history.push(action.payload);
    },
    clearHistory: (state) => {
      state.history = [];
    },
  },
});

export const { addRoute, clearHistory } = routeSlice.actions;
export default routeSlice.reducer;
