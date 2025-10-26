"use client"; // Important: This page uses client-side hooks

import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { useVerifyTwoFactorMutation } from "@/api/authApi"; // Adjust import path if needed
import { RootState } from "@/store"; // Adjust import path if needed
import { useEffect } from "react";

const TwoFactorSetupPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrCodeImageUrl = searchParams.get("qr");

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
    if (!twoFactorUserId || !qrCodeImageUrl) {
      router.replace("/login"); // Use replace to not add to history
    }
  }, [twoFactorUserId, qrCodeImageUrl, router]);

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

  if (!twoFactorUserId || !qrCodeImageUrl) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 shadow-lg rounded-2xl">
        <h2 className="text-2xl font-semibold text-black text-center mb-4">
          Set Up Two-Factor Authentication
        </h2>
        {/* Changed text-gray-600 to text-gray-800 for better contrast */}
        <p className="text-center text-black mb-6">
          Scan this QR code with your authenticator app and enter the 6-digit
          code below.
        </p>

        <div className="flex justify-center mb-6">
          <Image
            src={decodeURIComponent(qrCodeImageUrl)}
            alt="2FA QR Code"
            width={200}
            height={200}
          />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm text-black font-medium mb-1">
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
            {isLoading ? "Verifying..." : "Verify & Log In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TwoFactorSetupPage;
