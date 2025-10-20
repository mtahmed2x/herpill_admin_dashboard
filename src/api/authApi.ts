import { baseApi } from "./api";
import {
  ApiResponse,
  LoginRequest,
  LoginResponseData,
  LoginSuccessData,
  VerifyTwoFactorRequest,
} from "@/types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse<LoginResponseData>, LoginRequest>({
      query: (credentials) => ({
        url: "auth/login",
        method: "POST",
        body: credentials,
      }),
    }),

    verifyTwoFactor: builder.mutation<
      ApiResponse<LoginSuccessData>, // On success, it returns the user and tokens
      VerifyTwoFactorRequest
    >({
      query: (credentials) => ({
        url: "auth/verify-2fa",
        method: "POST",
        body: credentials,
      }),
    }),

    refreshToken: builder.mutation<
      ApiResponse<LoginSuccessData>,
      { refreshToken: string }
    >({
      query: ({ refreshToken }) => ({
        url: "auth/refresh",
        method: "POST",
        body: { refreshToken },
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useVerifyTwoFactorMutation,
  useRefreshTokenMutation,
} = authApi;
