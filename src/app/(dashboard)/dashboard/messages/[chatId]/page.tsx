"use client";

import { Send, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useEffect, ChangeEvent, useMemo } from "react";
import { useSelector } from "react-redux";
import { useParams } from "next/navigation";
import {
  chatApi,
  useGetChatsQuery,
  useGetMessagesQuery,
  useSendImageMessageMutation,
} from "@/api/chatApi";
import { useSocket } from "@/context/SocketContext";
import { RootState, useAppDispatch } from "@/store";
import { Chat, User, Message } from "@/types";

// Helper functions (no changes)
const getOtherParticipant = (
  chat: Chat,
  currentUserId: string
): User | null => {
  const other = chat.participants.find((p) => p.user._id !== currentUserId);
  return other?.user || null;
};

const getAvatarInitials = (name: string = ""): string =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

const getAvatarColor = (name: string = ""): string => {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-orange-500",
  ];
  return colors[name.length % colors.length];
};

const ChatPage = () => {
  // --- STATE AND REFS (no changes) ---
  const params = useParams();
  const activeChatId = params.chatId as string;

  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // --- HOOKS (no changes) ---
  const dispatch = useAppDispatch();
  const { socket, isConnected } = useSocket();
  const currentUserId = useSelector((state: RootState) => state.auth.user?._id);

  // --- RTK QUERY HOOKS (no changes) ---
  const selectActiveChat = useMemo(() => {
    return (chatsResult: any) => {
      const chat = chatsResult.data?.success
        ? chatsResult.data.data.data.find((c: Chat) => c._id === activeChatId)
        : null;
      const otherUser =
        chat && currentUserId ? getOtherParticipant(chat, currentUserId) : null;
      return {
        activeChat: chat,
        otherUser,
        isChatLoading: chatsResult.isLoading,
      };
    };
  }, [activeChatId, currentUserId]);

  const { activeChat, otherUser, isChatLoading } = useGetChatsQuery(undefined, {
    selectFromResult: selectActiveChat,
  });

  const { data: messagesResponse, isLoading: isLoadingMessages } =
    useGetMessagesQuery(activeChatId, { skip: !activeChat });

  const [sendImageMessage, { isLoading: isUploadingImage }] =
    useSendImageMessageMutation();

  // --- SOCKET.IO EFFECT (no changes) ---
  useEffect(() => {
    if (!socket || !isConnected || !activeChatId || !activeChat) return;

    socket.emit("joinChat", activeChatId);
    const handleReceiveMessage = (incomingMessage: any) => {
      if (incomingMessage.chatId === activeChatId) {
        dispatch(
          chatApi.util.updateQueryData("getMessages", activeChatId, (draft) => {
            const normalizedMessage: Message = {
              ...incomingMessage,
              senderId: incomingMessage.senderId || incomingMessage.sender?._id,
            };
            if (
              draft.success &&
              !draft.data.data.find(
                (m: Message) => m._id === normalizedMessage._id
              )
            ) {
              draft.data.data.unshift(normalizedMessage);
            }
          })
        );
      }
    };
    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [socket, isConnected, activeChatId, dispatch, activeChat, currentUserId]);

  // --- UI EFFECTS (no changes) ---
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesResponse]);

  // --- EVENT HANDLERS (no changes) ---
  const handleSendMessage = async () => {
    if (!activeChatId) return;
    if (selectedImage) {
      await sendImageMessage({
        chatId: activeChatId,
        attachment: selectedImage,
      }).unwrap();
      removeSelectedImage();
    } else if (newMessage.trim() && socket) {
      socket.emit("sendMessage", { chatId: activeChatId, text: newMessage });
      setNewMessage("");
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- RENDER LOGIC ---
  if (isChatLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>Loading conversation...</p>
      </div>
    );
  }

  if (!activeChat || !otherUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <p className="font-semibold">Chat not found.</p>
        <p className="text-sm">
          Please select a valid conversation from the list.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Chat Header */}
      <div className="p-5 border-b border-gray-200 bg-white flex items-center">
        <div
          className={`relative flex-shrink-0 h-10 w-10 rounded-full ${getAvatarColor(
            otherUser.firstName
          )} flex items-center justify-center text-white font-semibold`}
        >
          {otherUser.avatar ? (
            <Image
              src={otherUser.avatar}
              alt={otherUser.firstName}
              layout="fill"
              className="rounded-full object-cover"
            />
          ) : (
            getAvatarInitials(otherUser.firstName)
          )}
        </div>
        <div className="ml-4">
          <h2 className="text-lg font-semibold">
            {otherUser.firstName} {otherUser.surname}
          </h2>
          <p
            className={`text-xs ${
              isConnected ? "text-green-500" : "text-red-500"
            }`}
          >
            {isConnected ? "Online" : "Disconnected"}
          </p>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {isLoadingMessages ? (
            <p className="text-center text-gray-500">Loading messages...</p>
          ) : (
            messagesResponse?.success &&
            [...messagesResponse.data.data].reverse().map((message) => (
              // --- START OF HARDCODED FIX ---
              <div
                key={message._id}
                // This will now ALWAYS justify to the right
                className="flex justify-end"
              >
                <div
                  // This will now ALWAYS be blue with a rounded-br-none
                  className="max-w-md rounded-2xl px-4 py-3 shadow-sm bg-blue-500 text-white rounded-br-none"
                >
                  {message.attachment && (
                    <Image
                      src={message.attachment as unknown as string}
                      alt="attachment"
                      width={250}
                      height={250}
                      className="rounded-lg mb-2 object-cover"
                    />
                  )}
                  {message.text && <p className="text-sm">{message.text}</p>}
                  <p
                    // This will now ALWAYS have the light blue text color for the timestamp
                    className="text-xs mt-1 text-right text-blue-100"
                  >
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              // --- END OF HARDCODED FIX ---
            ))
          )}
          <div ref={messageEndRef} />
        </div>
      </div>

      {/* Image Preview & Message Input */}
      {imagePreview && (
        <div className="p-4 bg-gray-200 border-t border-gray-300">
          <div className="relative inline-block">
            <Image
              src={imagePreview}
              alt="Preview"
              width={96}
              height={96}
              className="h-24 w-24 object-cover rounded-lg border"
            />
            <button
              onClick={removeSelectedImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <div className="p-5 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            disabled={isUploadingImage}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`cursor-pointer bg-gray-200 p-3 rounded-lg ${
              isUploadingImage || selectedImage
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-300"
            }`}
          >
            <Upload />
          </label>
          <div className="flex-1 flex">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={!!selectedImage || isUploadingImage}
              className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              onClick={handleSendMessage}
              disabled={
                (!newMessage.trim() && !selectedImage) || isUploadingImage
              }
              className="bg-blue-500 text-white p-3 rounded-r-lg hover:bg-blue-600 disabled:bg-blue-300"
            >
              {isUploadingImage ? "Sending..." : <Send />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatPage;
