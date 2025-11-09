"use client";

import React, { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CallButtonProps {
  roomId: string;
  targetUserId?: string;
  chatType: "DM" | "Group";
  onInitiateCall: (callData: {
    roomId: string;
    targetUserId?: string;
    callType: "audio" | "video";
    chatType: "DM" | "Group";
  }) => void;
  disabled?: boolean;
  className?: string;
}

export default function CallButton({
  roomId,
  targetUserId,
  chatType,
  onInitiateCall,
  disabled = false,
  className = "",
}: CallButtonProps) {
  const [showCallOptions, setShowCallOptions] = useState(false);

  const handleCallInitiation = (callType: "audio" | "video") => {
    onInitiateCall({
      roomId,
      targetUserId,
      callType,
      chatType,
    });
    setShowCallOptions(false);
  };

  const toggleCallOptions = () => {
    if (!disabled) {
      setShowCallOptions(!showCallOptions);
    }
  };

  if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
    return null;
  }

  return (
    <Popover open={showCallOptions && !disabled} onOpenChange={setShowCallOptions}>
      <PopoverTrigger asChild>
        <button
          onClick={toggleCallOptions}
          disabled={disabled}
          className={`
            rounded-lg p-2 transition-all duration-200 hover:scale-105
            ${
              disabled
                ? "cursor-not-allowed bg-gray-300 text-gray-500"
                : "bg-blue-500 text-white shadow-lg hover:bg-blue-600 hover:shadow-xl"
            }
          `}
          title="Start a call"
          tabIndex={disabled ? -1 : 0}
          aria-haspopup="menu"
          aria-expanded={showCallOptions && !disabled}
        >
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        className="z-50 mb-2 min-w-[160px] bg-white p-0 dark:bg-zinc-800"
      >
        <div className="py-2">
          {/* Audio Call Option */}
          <button
            onClick={() => handleCallInitiation("audio")}
            className="flex w-full items-center space-x-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            type="button"
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-green-100">
              <span className="text-sm text-green-600">📞</span>
            </div>
            <div>
              <div className="font-medium text-gray-900">Audio Call</div>
              <div className="text-sm text-gray-500">Voice only</div>
            </div>
          </button>

          {/* Video Call Option - Only for DM */}
          {chatType === "DM" && (
            <button
              onClick={() => handleCallInitiation("video")}
              className="flex w-full items-center space-x-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
              type="button"
            >
              <div className="flex size-8 items-center justify-center rounded-full bg-blue-100">
                <span className="text-sm text-blue-600">📹</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">Video Call</div>
                <div className="text-sm text-gray-500">With camera</div>
              </div>
            </button>
          )}

          {/* Divider */}
          <div className="my-1 border-t border-gray-200"></div>

          {/* Cancel Option */}
          <button
            onClick={() => setShowCallOptions(false)}
            className="w-full px-4 py-2 text-center text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            type="button"
          >
            Cancel
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
