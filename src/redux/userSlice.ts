import { createSlice } from '@reduxjs/toolkit';

export interface UserData {
  _id: string,
  firstname: string,
  lastname: string,
  name: string,
  email: string,
  username: string,
  dp: string,
  verified: boolean
  chatid: string,
};

const userdata: UserData = {
  firstname: '',
  lastname: '',
  email: '',
  username: '',
  dp: '',
  verified: false,
  chatid: '',
  _id: '',
  name: ''
}

const userSlice = createSlice({
    name: 'user',
    initialState: {
      userdata: userdata,
    },
    reducers: {
      setUserData: (state, action) => {
        state.userdata = action.payload;
      },
    },
});

export const { setUserData } = userSlice.actions;
export default userSlice.reducer;