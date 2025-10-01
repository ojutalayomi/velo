import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FormData } from "../components/pg/FormProps";
import { ThunkAction, Action } from "@reduxjs/toolkit";
import { RootState } from "./store";

// Define AppThunk type
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

const initialFormData: FormData = {
  firstname: "",
  lastname: "",
  email: "",
  displayPicture: "",
  username: "",
  password: "",
  confirmPassword: "",
  file: null,
};

const signupSlice = createSlice({
  name: "signups",
  initialState: {
    formData: initialFormData,
    loading: false,
    success: false,
    error: false,
    error1: null as string | null,
    errors: {
      firstname: "",
      lastname: "",
      email: "",
      displayPicture: "",
      username: "",
      password: "",
      confirmPassword: "",
      file: "",
    },
    currentStep: 0,
  },
  reducers: {
    setFormData: (state, action: PayloadAction<Partial<FormData>>) => {
      state.formData = { ...state.formData, ...action.payload };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setSuccess: (state, action: PayloadAction<boolean>) => {
      state.success = action.payload;
    },
    setError: (state, action: PayloadAction<boolean>) => {
      state.error = action.payload;
    },
    setError1: (state, action: PayloadAction<string | null>) => {
      state.error1 = action.payload;
    },
    setErrors: (state, action: PayloadAction<Partial<Record<keyof FormData, string>>>) => {
      state.errors = { ...state.errors, ...action.payload };
    },
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
  },
});

export const {
  setFormData,
  setLoading,
  setSuccess,
  setError,
  setError1,
  setErrors,
  setCurrentStep,
} = signupSlice.actions;

// Thunk action creators
export const handleValidation =
  (page: number): AppThunk<Promise<boolean>> =>
  async (dispatch, getState) => {
    const { formData } = getState().signups;
    let valid = true;
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (page === 0 || page === 1 || page === 2) {
      if (!formData.firstname) {
        newErrors.firstname = "Firstname is required";
        valid = false;
      }
      if (!formData.lastname) {
        newErrors.lastname = "Lastname is required";
        valid = false;
      }
    }
    if (page === 1 || page === 2) {
      if (!formData.email) {
        newErrors.email = "Email is required";
        valid = false;
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Email is invalid";
        valid = false;
      }
      if (!formData.username) {
        newErrors.username = "Username is required";
        valid = false;
      }
    }
    if (page === 2) {
      if (!formData.password) {
        newErrors.password = "Password is required";
        valid = false;
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters long";
        valid = false;
      }
    }

    dispatch(setError(!valid));
    dispatch(setErrors(newErrors));
    return valid;
  };

export const handleNext =
  (step: number): AppThunk =>
  async (dispatch, getState) => {
    const { currentStep } = getState().signups;
    const isValid = await dispatch(handleValidation(currentStep));
    if (isValid) {
      dispatch(setCurrentStep(step));
    }
  };

export const handlePrevious =
  (step: number): AppThunk =>
  (dispatch, getState) => {
    const { currentStep } = getState().signups;
    if (currentStep) {
      dispatch(setCurrentStep(step));
    }
  };

export const updateFormData =
  (data: Partial<FormData>): AppThunk =>
  (dispatch) => {
    dispatch(setFormData(data));
  };

export default signupSlice.reducer;
