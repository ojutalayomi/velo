"use client";

import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

interface IncomingCallProps {
  socket: Socket;
  onAccept: (callData: any) => void;
  onDecline: () => void;
}

interface IncomingCallData {
  callId: string;
  roomId: string;
  callerId: string;
  callType: "audio" | "video";
  chatType: "DM" | "Group";
  callerName?: string;
}

export default function IncomingCall({ socket, onAccept, onDecline }: IncomingCallProps) {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [isRinging, setIsRinging] = useState(false);

  useEffect(() => {
    const handleIncomingCall = (data: IncomingCallData) => {
      setIncomingCall(data);
      setIsRinging(true);

      // Auto-decline after 30 seconds if not answered
      const timeout = setTimeout(() => {
        if (isRinging) {
          handleDecline();
        }
      }, 30000);

      return () => clearTimeout(timeout);
    };

    socket.on("call:invite", handleIncomingCall);

    return () => {
      socket.off("call:invite", handleIncomingCall);
    };
  }, [socket, isRinging]);

  const handleAccept = () => {
    if (!incomingCall) return;

    setIsRinging(false);

    // Emit call:answer to server
    socket.emit("call:answer", {
      callId: incomingCall.callId,
      accepted: true,
    });

    onAccept(incomingCall);
    setIncomingCall(null);
  };

  const handleDecline = () => {
    if (!incomingCall) return;

    setIsRinging(false);
    socket.emit("call:answer", {
      callId: incomingCall.callId,
      accepted: false,
    });
    onDecline();
    setIncomingCall(null);
  };

  if (!incomingCall || !isRinging) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in slide-in-from-bottom-4 duration-300">
        {/* Caller Info */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            {incomingCall.callType === "video" ? (
              <span className="text-3xl">📹</span>
            ) : (
              <span className="text-3xl">📞</span>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Incoming {incomingCall.callType === "video" ? "Video" : "Audio"} Call
          </h2>

          <p className="text-gray-600">
            {incomingCall.callerName || `User ${incomingCall.callerId}`}
          </p>

          <p className="text-sm text-gray-500 mt-1">
            {incomingCall.chatType === "DM" ? "Direct Message" : "Group Chat"}
          </p>
        </div>

        {/* Ringing Animation */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
            <div
              className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          {/* Decline Button */}
          <button
            onClick={handleDecline}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <span className="text-xl">📵</span>
            <span>Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <span className="text-xl">✅</span>
            <span>Accept</span>
          </button>
        </div>

        {/* Call Type Indicator */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full">
            <span className="text-sm text-gray-600">
              {incomingCall.callType === "video" ? "📹 Video Call" : "📞 Audio Call"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
