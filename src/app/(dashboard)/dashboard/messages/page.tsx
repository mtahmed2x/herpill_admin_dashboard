"use client";

import { MessageSquare } from "lucide-react";

// This component is the "empty pane" shown when no chat is selected.
const MessagesPlaceholder = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100">
      <div className="text-center">
        <MessageSquare className="mx-auto h-16 w-16 text-gray-400" />
        <h2 className="mt-4 text-2xl font-semibold text-gray-700">
          Your Messages
        </h2>
        <p className="mt-2 text-gray-500">
          Select a conversation from the list on the left to get started.
        </p>
      </div>
    </div>
  );
};

export default MessagesPlaceholder;
