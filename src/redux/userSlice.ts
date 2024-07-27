import { createSlice } from '@reduxjs/toolkit';

interface userData {
    firstname: string,
    lastname: string,
    email: string,
    username: string,
    dp: string,
    verified: boolean
    chatid: string,
};

const userdata: userData = {
    firstname: '',
    lastname: '',
    email: '',
    username: '',
    dp: '',
    verified: false,
    chatid: ''
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