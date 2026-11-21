"use client";

import { Phone, Video } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CallChatType, CallPeerInfo, CallType } from "@/lib/call/callState";
import { cn } from "@/lib/utils";

import { useOptionalCall } from "./callContext";

interface CallButtonProps {
  roomId: string;
  targetUserId?: string;
  chatType: CallChatType;
  /** Name and picture shown on the calling screen. */
  peer: CallPeerInfo;
  /** Disable the button (e.g. when chatting with a bot). */
  disabled?: boolean;
  className?: string;
}

const OPTIONS: { type: CallType; label: string; Icon: typeof Phone }[] = [
  { type: "audio", label: "Voice call", Icon: Phone },
  { type: "video", label: "Video call", Icon: Video },
];

/** Header button that starts a voice or video call. */
export default function CallButton({
  roomId,
  targetUserId,
  chatType,
  peer,
  disabled = false,
  className,
}: CallButtonProps) {
  const call = useOptionalCall();
  const [open, setOpen] = useState(false);
  const busy = !call || call.state.status !== "idle";
  const isDisabled = disabled || busy;

  return (
    <Popover open={open && !isDisabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isDisabled}
          title={busy && call ? "You are already in a call" : "Start a call"}
          aria-label="Start a call"
          aria-haspopup="menu"
          className={cn(
            "rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-zinc-800",
            className
          )}
        >
          <Phone className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-44 rounded-xl bg-white p-1 shadow-lg dark:bg-zinc-800"
      >
        {OPTIONS.map(({ type, label, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setOpen(false);
              void call?.startCall({ roomId, targetUserId, callType: type, chatType, peer });
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:text-white dark:hover:bg-zinc-700"
          >
            <Icon size={16} className="text-brand" />
            {label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
