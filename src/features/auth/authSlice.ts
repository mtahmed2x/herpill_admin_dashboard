import { createSlice, PayloadAction, isAnyOf } from "@reduxjs/toolkit";
import { LoginResponseData, User } from "@/types";
import { AppDispatch } from "@/store";
import { authApi } from "@/api/authApi";
import { baseApi } from "@/api/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

// The initial state is now clean and represents a logged-out user.
// redux-persist will overwrite this with the stored data on page load.
const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<LoginResponseData>) => {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      // REMOVED: All manual localStorage.setItem() calls are now gone.
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      // REMOVED: All manual localStorage.removeItem() calls are now gone.
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      isAnyOf(
        authApi.endpoints.login.matchFulfilled,
        authApi.endpoints.refreshToken.matchFulfilled
      ),
      (state, { payload }) => {
        // This logic remains the same, it just updates the state in memory.
        // redux-persist will automatically save the new state to storage.
        if (payload.success) {
          authSlice.caseReducers.setCredentials(state, {
            payload: payload.data,
            type: "setCredentials",
          });
        }
      }
    );
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

export const logoutUser = () => (dispatch: AppDispatch) => {
  dispatch(logout());
  dispatch(baseApi.util.resetApiState());
};
