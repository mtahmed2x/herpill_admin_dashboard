"use client"; // Important: This page uses client-side hooks

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { useVerifyTwoFactorMutation } from "@/api/authApi"; // Adjust import path if needed
import { RootState } from "@/store"; // Adjust import path if needed
import { useEffect } from "react";

const TwoFactorVerifyPage = () => {
  const router = useRouter();
  const { twoFactorUserId } = useSelector((state: RootState) => state.auth);
  const [verify, { isLoading, error }] = useVerifyTwoFactorMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<{ token: string }>();

  // Effect to redirect if the user lands here without the necessary state
  useEffect(() => {
    if (!twoFactorUserId) {
      router.replace("/login");
    }
  }, [twoFactorUserId, router]);

  const onSubmit = async (data: { token: string }) => {
    if (!twoFactorUserId) return; // Guard clause
    try {
      await verify({ userId: twoFactorUserId, token: data.token }).unwrap();
      router.push("/dashboard");
    } catch (err: any) {
      setError("token", {
        type: "manual",
        message: err.data?.message || "Invalid token. Please try again.",
      });
    }
  };

  // Render a loading state or null while redirecting
  if (!twoFactorUserId) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 shadow-lg rounded-2xl">
        <h2 className="text-2xl font-semibold text-black text-center mb-6">
          Two-Factor Verification
        </h2>
        <p className="text-center text-black mb-6">
          Enter the code from your authenticator app.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-black text-sm font-medium mb-1">
              Verification Code
            </label>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              {...register("token", {
                required: "Verification code is required",
                minLength: { value: 6, message: "Code must be 6 digits" },
                maxLength: { value: 6, message: "Code must be 6 digits" },
              })}
              className="w-full px-4 py-2 text-black border border-pink-400 rounded focus:ring-2 focus:ring-pink-600 outline-none"
            />
            {errors.token && (
              <p className="text-red-500 text-sm mt-1">
                {errors.token.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded bg-pink-400 text-white font-semibold hover:bg-pink-500 transition"
            disabled={isLoading}
          >
            {isLoading ? "Verifying..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TwoFactorVerifyPage;
