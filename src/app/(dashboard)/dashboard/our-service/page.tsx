"use client";

import {
  useGetPopsQuery,
  useGetCocpsQuery,
  useDeletePopMutation,
  useDeleteCocpMutation,
  useUpdatePopStatusMutation,
  useUpdateCocpStatusMutation,
} from "@/api/serviceApi";
import { Pop, Cocp, User, DeliveryStatus} from "@/types"; // Import new types
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

// Enum for the *approval* status
// (This was already in your file)
enum ServiceStatus {
  Pending = "pending",
  Accept = "accept",
  Decline = "decline",
}

// Enum for the *delivery* status
// (This was at the bottom of your file, make sure it's accessible)
// We'll assume it's imported from @/types
/*
export enum DeliveryStatus {
  Pending = "pending",
  Started = "started",
  Done = "done",
}
*/

// --- NEW ENUM ---
// This enum defines the state of the UI tabs
enum TabStatus {
  Pending = "pending",
  Accept = "accept",
  Decline = "decline",
  Done = "done", // The new tab
}

// --- Utility function to format ISO date string ---
const formatDateTime = (isoString: string) => {
  if (!isoString) return { date: "N/A", time: "N/A" };
  try {
    const dateObj = new Date(isoString);
    const date = dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const time = dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { date, time };
  } catch (error) {
    return { date: "Invalid Date", time: "Invalid Time" };
  }
};
// ----------------------------------------------------

const OurServicePage = () => {
  const [activeServiceTab, setActiveServiceTab] = useState<"POP" | "COCP">(
    "POP"
  );
  // --- MODIFIED ---
  // Use the new TabStatus enum for this state
  const [activeStatusTab, setActiveStatusTab] = useState<TabStatus>(
    TabStatus.Pending
  );

  // Pagination state
  const [popPage, setPopPage] = useState(1);
  const [cocpPage, setCocpPage] = useState(1);
  const localLimit = 10; // Items per page

  // --- RTK Query Data Fetching Hooks ---
  const popQueryParams = { page: 1, limit: 1000 };
  const cocpQueryParams = { page: 1, limit: 1000 };

  const {
    data: popResponse,
    isLoading: isPopLoading,
    isFetching: isPopFetching,
    isError: isPopError,
  } = useGetPopsQuery(popQueryParams, {
    skip: activeServiceTab !== "POP",
  });

  const {
    data: cocpResponse,
    isLoading: isCocpLoading,
    isFetching: isCocpFetching,
    isError: isCocpError,
  } = useGetCocpsQuery(cocpQueryParams, {
    skip: activeServiceTab !== "COCP",
  });

  // --- RTK Query Mutation Hooks ---
  const [deletePop] = useDeletePopMutation();
  const [deleteCocp] = useDeleteCocpMutation();
  const [updatePopStatus, { isLoading: isUpdatingPop }] =
    useUpdatePopStatusMutation();
  const [updateCocpStatus, { isLoading: isUpdatingCocp }] =
    useUpdateCocpStatusMutation();

  const isUpdatingStatus = isUpdatingPop || isUpdatingCocp;

  // --- Event Handlers ---

  const handleServiceTabChange = (tab: "POP" | "COCP") => {
    setActiveServiceTab(tab);
    setPopPage(1);
    setCocpPage(1);
  };

  // --- MODIFIED ---
  // Update the parameter type to use TabStatus
  const handleStatusTabChange = (status: TabStatus) => {
    setActiveStatusTab(status);
    if (activeServiceTab === "POP") {
      setPopPage(1);
    } else {
      setCocpPage(1);
    }
  };

  const handleStatusUpdate = async (
    id: string,
    status: "accept" | "decline"
  ) => {
    const actionText = status === "accept" ? "accept" : "decline";
    try {
      const mutation =
        activeServiceTab === "POP" ? updatePopStatus : updateCocpStatus;
      const response = await mutation({ id, status }).unwrap();
      toast.success(
        response.message || `Request successfully ${actionText}ed.`
      );
    } catch (err: any) {
      console.error(`Failed to ${actionText} request:`, err);
      toast.error(
        err.data?.message ||
          `An error occurred while trying to ${actionText} the request.`
      );
    }
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This request will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const mutation = activeServiceTab === "POP" ? deletePop : deleteCocp;
          const response = await mutation(id).unwrap();
          toast.success(response.message || "Request deleted successfully!");
          Swal.fire("Deleted!", "The request has been removed.", "success");
        } catch (err: any) {
          console.error("Failed to delete request::", err);
          toast.error(err.data?.message || "An error occurred while deleting.");
        }
      }
    });
  };

  // --- Derived State for Rendering (Frontend Filtering & Pagination) ---
  const isLoading = activeServiceTab === "POP" ? isPopLoading : isCocpLoading;
  const isFetching =
    activeServiceTab === "POP" ? isPopFetching : isCocpFetching;
  const isError = activeServiceTab === "POP" ? isPopError : isCocpError;
  const responseData = activeServiceTab === "POP" ? popResponse : cocpResponse;

  const allRequests = responseData?.data || [];

  // --- MODIFIED: FILTERING LOGIC ---
  // Filter data based on the activeStatusTab (which now includes 'Done')
  const filteredRequests = allRequests.filter((req: Pop | Cocp) => {
    switch (activeStatusTab) {
      case TabStatus.Pending:
        return req.status === ServiceStatus.Pending;
      case TabStatus.Decline:
        return req.status === ServiceStatus.Decline;
      case TabStatus.Accept:
        // "Accepted" tab now shows items that are accepted BUT NOT done
        return (
          req.status === ServiceStatus.Accept &&
          req.deliveryStatus !== DeliveryStatus.Done
        );
      case TabStatus.Done:
        // "Done" tab shows items that are accepted AND delivery is done
        return (
          req.status === ServiceStatus.Accept &&
          req.deliveryStatus === DeliveryStatus.Done
        );
      default:
        return false;
    }
  });

  // 3. Apply Local Pagination
  const currentPage = activeServiceTab === "POP" ? popPage : cocpPage;
  const setPage = activeServiceTab === "POP" ? setPopPage : setCocpPage;

  const totalItems = filteredRequests.length;
  const totalPage = Math.ceil(totalItems / localLimit);
  const startIndex = (currentPage - 1) * localLimit;
  const endIndex = startIndex + localLimit;

  const requestsToDisplay = filteredRequests.slice(startIndex, endIndex);

  const getUser = (user: User | string): Partial<User> => {
    return typeof user === "object" ? user : { _id: user };
  };

  // --- MODIFIED: Status Tab Data ---
  // Use the new TabStatus enum
  const statusTabs: { label: string; status: TabStatus }[] = [
    { label: "Pending", status: TabStatus.Pending },
    { label: "Accepted", status: TabStatus.Accept },
    { label: "Declined", status: TabStatus.Decline },
    { label: "Delivery Done", status: TabStatus.Done }, // New tab
  ];

  // --- NEW: Helper function for tab counts ---
  // This correctly counts items for the new tab logic
  const getTabCount = (status: TabStatus): number => {
    switch (status) {
      case TabStatus.Pending:
        return allRequests.filter((r) => r.status === ServiceStatus.Pending)
          .length;
      case TabStatus.Decline:
        return allRequests.filter((r) => r.status === ServiceStatus.Decline)
          .length;
      case TabStatus.Accept:
        return allRequests.filter(
          (r) =>
            r.status === ServiceStatus.Accept &&
            r.deliveryStatus !== DeliveryStatus.Done
        ).length;
      case TabStatus.Done:
        return allRequests.filter(
          (r) =>
            r.status === ServiceStatus.Accept &&
            r.deliveryStatus === DeliveryStatus.Done
        ).length;
      default:
        return 0;
    }
  };

  // --- Component Render ---
  return (
    <div>
      {/* Service Tabs (POP/COCP) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8">
        <div
          onClick={() => handleServiceTabChange("POP")}
          className={`cursor-pointer rounded-xl shadow-md p-6 border-b-2 border-gray-400 group transition-all duration-300 ${
            activeServiceTab === "POP"
              ? "bg-pink-300 text-white"
              : "bg-white hover:bg-pink-200"
          }`}
        >
          <p
            className={`text-md font-medium ${
              activeServiceTab === "POP"
                ? "text-white"
                : "text-gray-600 group-hover:text-white"
            }`}
          >
            Request
          </p>
          <h2
            className={`text-2xl font-bold ${
              activeServiceTab === "POP"
                ? "text-white"
                : "text-pink-400 group-hover:text-white"
            }`}
          >
            Progesterone Only Pill (POP)
          </h2>
        </div>

        <div
          onClick={() => handleServiceTabChange("COCP")}
          className={`cursor-pointer rounded-xl shadow-md p-6 border-b-2 border-gray-400 group transition-all duration-300 ${
            activeServiceTab === "COCP"
              ? "bg-pink-300 text-white"
              : "bg-white hover:bg-pink-200"
          }`}
        >
          <p
            className={`text-md font-medium ${
              activeServiceTab === "COCP"
                ? "text-white"
                : "text-gray-600 group-hover:text-white"
            }`}
          >
            Request
          </p>
          <h2
            className={`text-2xl font-bold ${
              activeServiceTab === "COCP"
                ? "text-white"
                : "text-pink-400 group-hover:text-white"
            }`}
          >
            Combined Contraceptive Pill (COCP)
          </h2>
        </div>
      </div>

      {/* --- MODIFIED: Status Tabs --- */}
      {/* Now maps all four tabs and uses getTabCount */}
      <div className="flex justify-center flex-wrap gap-4 mb-16">
        {statusTabs.map((tab) => (
          <button
            key={tab.status}
            onClick={() => handleStatusTabChange(tab.status)}
            className={`py-2 px-6 rounded-lg text-lg font-semibold transition-all duration-200 
              ${
                activeStatusTab === tab.status
                  ? "bg-fuchsia-400 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-fuchsia-200"
              }`}
          >
            {tab.label} ({getTabCount(tab.status)}) {/* Use helper function */}
          </button>
        ))}
      </div>

      {/* Table & Pagination Container */}
      <div className="p-6 bg-white shadow-md rounded-md text-gray-800 my-16 overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {activeServiceTab} Requests –{" "}
            {/* This logic still works for the new "Done" tab */}
            {activeStatusTab.charAt(0).toUpperCase() + activeStatusTab.slice(1)}
          </h2>
          {isFetching && (
            <span className="text-pink-400 text-sm animate-pulse">
              Updating...
            </span>
          )}
        </div>
        <table className="w-full border border-pink-200 rounded-2xl">
          <thead>
            <tr className="bg-fuchsia-100">
              <th className="p-2 border border-pink-200">Profile</th>
              <th className="p-2 border border-pink-200">Name</th>
              <th className="p-2 border border-pink-200">Email</th>
              <th className="p-2 border border-pink-200">Phone</th>
              <th className="p-2 border border-pink-200">Date</th>
              <th className="p-2 border border-pink-200">Time</th>
              <th className="p-2 border border-pink-200">Delivery Status</th>
              <th className="p-2 border border-pink-200">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  Loading service data...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-red-500">
                  Failed to load data. Please try again.
                </td>
              </tr>
            ) : requestsToDisplay.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-4 text-center text-gray-500 italic"
                >
                  No {activeStatusTab} requests found for {activeServiceTab}.
                </td>
              </tr>
            ) : (
              requestsToDisplay.map((req: Pop | Cocp) => {
                const user = getUser(req.userId);
                const requestType = activeServiceTab.toLowerCase();
                const { date, time } = formatDateTime(req.createdAt || "");

                return (
                  <tr key={req._id} className="text-center">
                    <td className="p-1 border border-pink-200 flex justify-center">
                      <Image
                        src={
                          user.avatar ||
                          "https://i.postimg.cc/4xLZjmW2/dfb6892164e638fc869bc424d651235a519c6d80.png"
                        }
                        alt={user.firstName || "User Avatar"}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </td>
                    <td className="p-2 border border-pink-200">
                      {user.firstName || "N/A"}
                    </td>
                    <td className="p-2 border border-pink-200">
                      {user.email || "N/A"}
                    </td>
                    <td className="p-2 border border-pink-200">
                      {user.phoneNumber || "N/A"}
                    </td>
                    <td className="p-2 border border-pink-200">{date}</td>
                    <td className="p-2 border border-pink-200">{time}</td>
                    <td className="p-2 border border-pink-200">
                      {req.deliveryStatus
                        ? req.deliveryStatus.charAt(0).toUpperCase() +
                          req.deliveryStatus.slice(1)
                        : "Pending"}
                    </td>
                    <td className="p-2 border border-pink-200">
                      <div className="flex gap-2 justify-center items-center">
                        {/* Button logic remains the same.
                          - "Pending" tab shows "Accept/Decline".
                          - "Accepted", "Declined", and new "Done" tabs 
                            will all trigger the second block (Details/Delete)
                            because their `req.status` is not "pending".
                            This is the correct behavior.
                        */}
                        {req.status === ServiceStatus.Pending && (
                          <>
                            <Link
                              href={`/dashboard/our-service/${req._id}?type=${requestType}`}
                              className="px-3 py-1 bg-blue-200 hover:bg-blue-500 text-blue-800 hover:text-white rounded border border-blue-300 transition-colors"
                            >
                              Details
                            </Link>
                            <button
                              onClick={() =>
                                handleStatusUpdate(req._id, "accept")
                              }
                              disabled={isUpdatingStatus}
                              className="px-3 py-1 bg-green-200 hover:bg-green-500 text-green-800 hover:text-white rounded border border-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                handleStatusUpdate(req._id, "decline")
                              }
                              disabled={isUpdatingStatus}
                              className="px-3 py-1 bg-yellow-200 hover:bg-yellow-500 text-yellow-800 hover:text-white rounded border border-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {(req.status === ServiceStatus.Accept ||
                          req.status === ServiceStatus.Decline) && (
                          <>
                            <Link
                              href={`/dashboard/our-service/${req._id}?type=${requestType}`}
                              className="px-3 py-1 bg-blue-200 hover:bg-blue-500 text-blue-800 hover:text-white rounded border border-blue-300 transition-colors"
                            >
                              Details
                            </Link>
                            <button
                              onClick={() => handleDelete(req._id)}
                              className="px-3 py-1 bg-red-200 hover:bg-red-500 text-red-800 hover:text-white rounded border border-red-300 transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Controls (No changes needed) */}
        {!isLoading && !isError && totalPage > 1 && (
          <div className="flex justify-end items-center mt-6 space-x-2">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || isFetching}
              className="px-4 py-2 text-sm font-medium text-pink-700 bg-pink-100 rounded-lg hover:bg-pink-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-700 text-sm">
              Page {currentPage} of {totalPage}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPage, currentPage + 1))}
              disabled={currentPage === totalPage || isFetching}
              className="px-4 py-2 text-sm font-medium text-pink-700 bg-pink-100 rounded-lg hover:bg-pink-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OurServicePage;

