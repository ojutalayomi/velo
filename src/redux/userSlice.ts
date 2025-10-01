import { UserData, UserSettings } from "@/lib/types/type";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const userdata: UserData = {
  firstname: "",
  lastname: "",
  email: "",
  username: "",
  displayPicture: "",
  verified: false,
  _id: "",
  name: "",
  time: "",
  userId: "",
  providers: {},
};

const userSlice = createSlice({
  name: "user",
  initialState: {
    userdata: userdata,
    settings: {
      twoFactorAuth: false,
      loginAlerts: true,
      showOnlineStatus: true,
      showLastSeen: true,
      showReadReceipts: true,
      showTypingStatus: true,
    },
  },
  reducers: {
    setUserData: (state, action: PayloadAction<UserData>) => {
      state.userdata = action.payload;
    },
    updateUserData: (state, action: PayloadAction<UserData>) => {
      state.userdata = { ...state.userdata, ...action.payload };
    },
    updateSettings: (state, action: PayloadAction<UserSettings>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
  },
});

export const { setUserData, updateUserData, updateSettings } = userSlice.actions;
export default userSlice.reducer;
export interface UserDataPartial extends Partial<UserData> {
  displayPicture: string;
}
