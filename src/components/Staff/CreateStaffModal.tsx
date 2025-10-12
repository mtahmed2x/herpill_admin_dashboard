"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useCreateStaffMutation } from "@/api/userApi";
import { X } from "lucide-react";

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateStaffModal = ({
  isOpen,
  onClose,
  onSuccess,
}: CreateStaffModalProps) => {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [createStaff, { isLoading }] = useCreateStaffMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      await createStaff({ firstName, email, password }).unwrap();
      toast.success("Staff member created successfully!");
      onSuccess(); // This will close the modal and trigger a list refresh
    } catch (err: any) {
      console.error("Failed to create staff:", err);
      toast.error(err.data?.message || "An error occurred. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    // Backdrop
    // MODIFIED: Added 'backdrop-blur-sm' for a modern blur effect
    // and slightly reduced the background opacity for a softer look.
    <div className="fixed inset-0 bg-opacity-25 z-40 flex justify-center items-center backdrop-blur-sm">
      {/* Modal Content */}
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md m-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          disabled={isLoading}
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-pink-600 mb-6">
          Create New Staff
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* All form fields remain the same */}
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-700"
            >
              Full Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
              placeholder="Enter full name"
              required
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
              placeholder="Enter a secure password"
              required
            />
          </div>
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-pink-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Staff Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
