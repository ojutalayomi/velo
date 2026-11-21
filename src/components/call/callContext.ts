"use client";

import { createContext, useContext } from "react";

import type {
  CallChatType,
  CallPeerInfo,
  CallState,
  CallType,
} from "@/lib/call/callState";

export interface StartCallInput {
  roomId: string;
  targetUserId?: string;
  callType: CallType;
  chatType: CallChatType;
  /** Who is being called, shown on the calling screen. */
  peer: CallPeerInfo;
}

/** A group call that is live right now and can be joined. */
export interface GroupCallInfo {
  callId: string;
  callType: CallType;
  count: number;
  max: number;
}

export interface CallContextValue {
  state: CallState;
  localStream: MediaStream | null;
  /** Remote media by participant user id. */
  remoteStreams: Record<string, MediaStream>;
  /** Live group calls by chat id (for the "join call" banner). */
  groupCalls: Record<string, GroupCallInfo>;
  joinGroupCall: (input: { roomId: string; name: string; avatar?: string }) => Promise<void>;
  startCall: (input: StartCallInput) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setMinimized: (value: boolean) => void;
}

export const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall must be used within a CallProvider");
  return context;
}

/** Like useCall, but returns null outside a provider (e.g. while the socket is still connecting). */
export function useOptionalCall(): CallContextValue | null {
  return useContext(CallContext);
}
