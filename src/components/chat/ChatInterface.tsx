"use client";

import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import {
  CallButton,
  CallInterface,
  IncomingCall,
  CallStatus,
  useCallManager,
} from "@/components/call";
import { UserSchema } from "@/lib/types/type";

interface ChatInterfaceProps {
  socket: Socket;
  roomId: string;
  targetUserId?: string;
  chatType: "DMs" | "Groups";
  roomName?: string;
}

export default function ChatInterface({
  socket,
  roomId,
  targetUserId,
  chatType,
  roomName,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      text: string;
      senderId: string;
      timestamp: Date;
    }>
  >([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const { callState, initiateCall, answerCall, endCall, getWebRTCManager } = useCallManager(socket);

  const userId =
    socket.auth && typeof socket.auth === "object"
      ? (socket.auth as { [key: string]: any }).userId
      : undefined;

  // Handle incoming call
  const handleIncomingCall = (callData: {
    callId: string;
    roomId: string;
    callerId: string;
    callType: "audio" | "video";
    chatType: "DMs" | "Groups";
  }) => {
    // The IncomingCall component will handle the UI
    // This function can be used for additional logic
    console.log("Incoming call:", callData);
  };

  // Handle call end
  const handleCallEnd = () => {
    endCall();
  };

  // Send message
  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      text: newMessage,
      senderId: userId || "unknown",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");

    // Emit message through socket
    socket.emit("message", {
      roomId,
      text: newMessage,
      timestamp: message.timestamp,
    });
  };

  // Handle incoming messages
  useEffect(() => {
    const handleMessage = (data: {
      id: string;
      text: string;
      senderId: string;
      timestamp: string;
    }) => {
      if (data.id === roomId) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: data.text,
            senderId: data.senderId,
            timestamp: new Date(data.timestamp),
          },
        ]);
      }
    };

    socket.on("message", handleMessage);

    return () => {
      socket.off("message", handleMessage);
    };
  }, [socket, roomId]);

  // Handle typing indicators
  useEffect(() => {
    const handleTyping = (data: { user: Partial<UserSchema>; to: string }) => {
      if (data.to === roomId && data.user.userId !== userId) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };

    socket.on("typing", handleTyping);

    return () => {
      socket.off("typing", handleTyping);
    };
  }, [socket, roomId]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {roomName ? roomName.charAt(0).toUpperCase() : "C"}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {roomName || `Room ${roomId}`}
              </h2>
              <p className="text-sm text-gray-500">
                {chatType === "DMs" ? "Direct Message" : "Group Chat"}
              </p>
            </div>
          </div>

          {/* Call Button */}
          <CallButton
            roomId={roomId}
            targetUserId={targetUserId}
            chatType={chatType}
            onInitiateCall={initiateCall}
            disabled={callState.isInCall}
            className="ml-4"
          />
        </div>
      </div>

      {/* Call Status */}
      {callState.isInCall && (
        <CallStatus
          state={
            callState.isConnecting ? "connecting" : callState.isConnected ? "connected" : "idle"
          }
          callType={callState.callType || "audio"}
          roomId={roomId}
        />
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === userId ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.senderId === userId
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-900 border border-gray-200"
              }`}
            >
              <p className="text-sm">{message.text}</p>
              <p
                className={`text-xs mt-1 ${
                  message.senderId === userId ? "text-blue-100" : "text-gray-500"
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Call Interface Overlay */}
      {callState.isInCall && (
        <div className="fixed inset-0 z-50 bg-black/90">
          <CallInterface
            socket={socket}
            roomId={roomId}
            targetUserId={targetUserId}
            chatType={chatType}
            onCallEnd={handleCallEnd}
          />
        </div>
      )}

      {/* Incoming Call Overlay */}
      <IncomingCall
        socket={socket}
        onAccept={handleIncomingCall}
        onDecline={() => {
          // Handle declined call
          console.log("Call declined");
        }}
      />
    </div>
  );
}
