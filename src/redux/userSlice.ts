import { UserData } from '@/lib/types/type';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
export type { UserData } from '@/lib/types/type';

const userdata: UserData = {
  firstname: '',
  lastname: '',
  email: '',
  username: '',
  displayPicture: '',
  verified: false,
  _id: '',
  name: '',
  time: '',
  userId: '',
  providers: {}
}

const userSlice = createSlice({
  name: 'user',
  initialState: {
    userdata: userdata,
  },
  reducers: {
    setUserData: (state, action: PayloadAction<UserData>) => {
      state.userdata = action.payload;
    },
    updateUserData: (state, action: PayloadAction<UserData>) => {
      state.userdata = { ...state.userdata, ...action.payload };
    },
  },
});

export const { setUserData, updateUserData } = userSlice.actions;
export default userSlice.reducer;
export interface UserDataPartial extends Partial<UserData> {
  displayPicture: string;
}
