import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LoginSuccessData, User } from "@/types";
import { AppDispatch } from "@/store";
import { authApi } from "@/api/authApi";
import { baseApi } from "@/api/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  twoFactorUserId: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  twoFactorUserId: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<LoginSuccessData>) => {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      state.twoFactorUserId = null; // This is fine for direct login, but not for 2FA flow
    },
    setTwoFactorUserId: (state, action: PayloadAction<string>) => {
      state.twoFactorUserId = action.payload;
    },
    // NEW reducer for cleanup
    clearTwoFactorUserId: (state) => {
      state.twoFactorUserId = null;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.twoFactorUserId = null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      authApi.endpoints.verifyTwoFactor.matchFulfilled,
      (state, { payload }) => {
        // MODIFIED LOGIC: Set credentials directly to avoid clearing twoFactorUserId
        if (payload.success) {
          const { user, accessToken, refreshToken } = payload.data;
          state.user = user;
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.isAuthenticated = true;
          // We do NOT clear twoFactorUserId here. This resolves the race condition.
        }
      }
    );
  },
});

// Export the new action
export const {
  setCredentials,
  setTwoFactorUserId,
  clearTwoFactorUserId,
  logout,
} = authSlice.actions;
export default authSlice.reducer;

export const logoutUser = () => (dispatch: AppDispatch) => {
  dispatch(logout());
  dispatch(baseApi.util.resetApiState());
};
