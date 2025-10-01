"use client";

import React from "react";

interface CallStatusProps {
  state: "idle" | "connecting" | "connected" | "ended" | "declined";
  callType: "audio" | "video";
  roomId: string;
}

export default function CallStatus({ state, callType, roomId }: CallStatusProps) {
  const getStatusText = () => {
    switch (state) {
      case "connecting":
        return "Connecting...";
      case "connected":
        return "Connected";
      case "ended":
        return "Call ended";
      case "declined":
        return "Call declined";
      default:
        return "Ready to call";
    }
  };

  const getStatusIcon = () => {
    switch (state) {
      case "connecting":
        return (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Connecting...</span>
          </div>
        );
      case "connected":
        return (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span>Connected</span>
          </div>
        );
      case "ended":
        return (
          <div className="flex items-center space-x-2">
            <span>📞</span>
            <span>Call ended</span>
          </div>
        );
      case "declined":
        return (
          <div className="flex items-center space-x-2">
            <span>❌</span>
            <span>Call declined</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2">
            <span>📱</span>
            <span>Ready to call</span>
          </div>
        );
    }
  };

  if (state === "idle") {
    return null;
  }

  return (
    <div className="bg-gray-800/90 backdrop-blur-sm p-4 border-b border-gray-700">
      <div className="flex flex-col items-center justify-between">
        <div className="flex flex-col items-center space-x-3">
          <div className="flex items-center space-x-2">
            {callType === "video" ? (
              <span className="text-blue-400">📹</span>
            ) : (
              <span className="text-green-400">📞</span>
            )}
            <span className="text-sm text-gray-300">
              {callType === "video" ? "Video Call" : "Audio Call"}
            </span>
          </div>

          <div className="text-gray-400">•</div>

          <div className="text-sm text-gray-300">Room: {roomId}</div>
        </div>

        <div className="text-sm text-gray-300">{getStatusIcon()}</div>
      </div>

      {state === "connecting" && (
        <div className="mt-2">
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full animate-pulse"
              style={{ width: "60%" }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
