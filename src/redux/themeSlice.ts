import { createSlice } from "@reduxjs/toolkit";
import { createContext } from "react";

type Theme = "light" | "dark" | "system";

// interface ThemeContextType {
//   theme: Theme
//   setTheme: (theme: Theme) => void
// }

// const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
const mode: Theme = "light";
const themeSlice = createSlice({
  name: "theme",
  initialState: {
    theme: mode,
  },
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
  },
});

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
