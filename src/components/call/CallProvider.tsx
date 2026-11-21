"use client";

import { ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";

import { CallPeer, CallPermissionError } from "@/lib/call/callPeer";
import {
  callReducer,
  CallChatType,
  CallEndReason,
  CallType,
  initialCallState,
} from "@/lib/call/callState";

import CallOverlay from "./CallOverlay";
import { CallContext, CallContextValue, StartCallInput } from "./callContext";

const ENDED_SCREEN_MS = 2200;
/** Group invites have no server-side ring timeout, so the client stops ringing eventually. */
const GROUP_RING_MS = 45_000;

interface InvitePayload {
  callId: string;
  roomId: string;
  callerId: string;
  callerName?: string;
  callerAvatar?: string;
  callType: CallType;
  chatType: CallChatType;
}

export function CallProvider({ children, socket }: { children: ReactNode; socket: Socket }) {
  const [state, dispatch] = useReducer(callReducer, initialCallState);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerRef = useRef<CallPeer | null>(null);
  const stateRef = useRef(state);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearRingTimer = () => {
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    ringTimerRef.current = null;
  };

  /** Releases the camera/microphone and the connection. Safe to call repeatedly. */
  const teardown = useCallback(() => {
    clearRingTimer();
    peerRef.current?.close();
    peerRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const finish = useCallback(
    (reason: CallEndReason) => {
      teardown();
      dispatch({ type: "ended", reason });
    },
    [teardown]
  );

  const createPeer = useCallback(
    (callType: CallType, onFailed: () => void) => {
      const peer = new CallPeer(socket, callType, {
        onRemoteStream: setRemoteStream,
        onConnected: () => dispatch({ type: "connected", at: Date.now() }),
        onFailed,
      });
      peerRef.current = peer;
      return peer;
    },
    [socket]
  );

  const startCall = useCallback(
    async (input: StartCallInput) => {
      if (stateRef.current.status !== "idle") return;
      if (!socket.connected) {
        toast.error("You are offline. Reconnect to place a call.");
        return;
      }
      dispatch({
        type: "outgoing",
        call: {
          callId: null,
          roomId: input.roomId,
          chatType: input.chatType,
          callType: input.callType,
          direction: "outgoing",
          peer: input.peer,
        },
      });
      const peer = createPeer(input.callType, () => {
        const id = stateRef.current.call?.callId;
        if (id) socket.emit("call:end", { callId: id });
        finish("failed");
      });
      try {
        // Ask for the microphone (and camera for video) before ringing anyone.
        setLocalStream(await peer.acquireMedia());
      } catch (error) {
        finish(error instanceof CallPermissionError ? "permission-denied" : "failed");
        return;
      }
      if (peerRef.current !== peer) return; // cancelled while the permission prompt was open
      socket.emit("call:invite", {
        roomId: input.roomId,
        targetUserId: input.targetUserId,
        callType: input.callType,
        chatType: input.chatType,
      });
    },
    [socket, createPeer, finish]
  );

  const acceptCall = useCallback(async () => {
    const current = stateRef.current;
    if (current.status !== "incoming" || !current.call?.callId) return;
    const { callId, callType } = current.call;
    clearRingTimer();
    dispatch({ type: "accepted" });

    const peer = createPeer(callType, () => {
      socket.emit("call:end", { callId });
      finish("failed");
    });
    peer.setCallId(callId);
    try {
      // Media must be ready before we answer: the caller sends its offer right away.
      setLocalStream(await peer.acquireMedia());
    } catch (error) {
      socket.emit("call:answer", { callId, accepted: false });
      finish(error instanceof CallPermissionError ? "permission-denied" : "failed");
      return;
    }
    if (peerRef.current !== peer) return;
    socket.emit("call:answer", { callId, accepted: true });
  }, [socket, createPeer, finish]);

  const declineCall = useCallback(() => {
    const callId = stateRef.current.call?.callId;
    if (stateRef.current.status !== "incoming") return;
    if (callId) socket.emit("call:answer", { callId, accepted: false });
    teardown();
    dispatch({ type: "reset" });
  }, [socket, teardown]);

  const endCall = useCallback(() => {
    const { status, call } = stateRef.current;
    if (status === "idle" || status === "ended") return;
    if (call?.callId) socket.emit("call:end", { callId: call.callId });
    finish("hangup");
  }, [socket, finish]);

  const toggleMute = useCallback(() => dispatch({ type: "toggleMute" }), []);
  const toggleCamera = useCallback(() => dispatch({ type: "toggleCamera" }), []);
  const setMinimized = useCallback(
    (value: boolean) => dispatch({ type: "setMinimized", value }),
    []
  );

  // Apply mute / camera toggles to the live tracks.
  useEffect(() => {
    peerRef.current?.setMuted(state.muted);
  }, [state.muted]);
  useEffect(() => {
    peerRef.current?.setCameraOff(state.cameraOff);
  }, [state.cameraOff]);

  // Server events.
  useEffect(() => {
    const matches = (callId?: string | null) =>
      !!callId && stateRef.current.call?.callId === callId;

    const onInvite = (data: InvitePayload) => {
      if (stateRef.current.status !== "idle") return; // busy: the server already answered for DMs
      dispatch({
        type: "incoming",
        call: {
          callId: data.callId,
          roomId: data.roomId,
          chatType: data.chatType,
          callType: data.callType,
          direction: "incoming",
          peer: { id: data.callerId, name: data.callerName || "Someone", avatar: data.callerAvatar },
        },
      });
      clearRingTimer();
      if (data.chatType === "Group") {
        ringTimerRef.current = setTimeout(() => {
          if (stateRef.current.status === "incoming") dispatch({ type: "reset" });
        }, GROUP_RING_MS);
      }
    };

    const onInitiated = (data: { callId: string }) => {
      if (stateRef.current.status !== "outgoing" || stateRef.current.call?.callId) return;
      peerRef.current?.setCallId(data.callId);
      dispatch({ type: "initiated", callId: data.callId });
    };

    const onAnswered = (data: { callId: string }) => {
      if (!matches(data.callId) || stateRef.current.status !== "outgoing") return;
      dispatch({ type: "accepted" });
      peerRef.current?.createOffer().catch(() => {
        socket.emit("call:end", { callId: data.callId });
        finish("failed");
      });
    };

    const onOffer = (data: { callId: string; offer: RTCSessionDescriptionInit }) => {
      if (!matches(data.callId)) return;
      peerRef.current?.handleOffer(data.offer).catch(() => {
        socket.emit("call:end", { callId: data.callId });
        finish("failed");
      });
    };

    const onAnswer = (data: { callId: string; answer: RTCSessionDescriptionInit }) => {
      if (matches(data.callId)) void peerRef.current?.handleAnswer(data.answer);
    };

    const onCandidate = (data: { callId: string; candidate: RTCIceCandidateInit }) => {
      if (matches(data.callId)) void peerRef.current?.addCandidate(data.candidate);
    };

    const onDeclined = (data: { callId: string }) => {
      if (matches(data.callId)) finish("declined");
    };

    const onEnded = (data: { callId: string | null; reason?: string; local?: boolean }) => {
      const { status } = stateRef.current;
      if (status === "idle" || status === "ended") return;
      // `local` rejections answer our own invite before it has an id.
      if (!data.local && !matches(data.callId)) return;
      const reason: CallEndReason =
        data.reason === "timeout" || data.reason === "busy" || data.reason === "already-in-call"
          ? data.reason
          : "hangup";
      if (status === "incoming" && reason === "hangup") {
        teardown();
        dispatch({ type: "reset" }); // the caller cancelled before we answered
      } else {
        finish(reason);
      }
    };

    // Another device (or group member) answered or declined; stop ringing here.
    const onHandled = (data: { callId: string }) => {
      if (stateRef.current.status === "incoming" && matches(data.callId)) {
        teardown();
        dispatch({ type: "reset" });
      }
    };

    socket.on("call:invite", onInvite);
    socket.on("call:initiated", onInitiated);
    socket.on("call:answered", onAnswered);
    socket.on("webrtc:offer", onOffer);
    socket.on("webrtc:answer", onAnswer);
    socket.on("webrtc:candidate", onCandidate);
    socket.on("call:declined", onDeclined);
    socket.on("call:ended", onEnded);
    socket.on("call:handled", onHandled);
    return () => {
      socket.off("call:invite", onInvite);
      socket.off("call:initiated", onInitiated);
      socket.off("call:answered", onAnswered);
      socket.off("webrtc:offer", onOffer);
      socket.off("webrtc:answer", onAnswer);
      socket.off("webrtc:candidate", onCandidate);
      socket.off("call:declined", onDeclined);
      socket.off("call:ended", onEnded);
      socket.off("call:handled", onHandled);
    };
  }, [socket, finish, teardown]);

  // Leave the "call ended" screen after a moment.
  useEffect(() => {
    if (state.status !== "ended") return;
    const timer = setTimeout(() => dispatch({ type: "reset" }), ENDED_SCREEN_MS);
    return () => clearTimeout(timer);
  }, [state.status]);

  // Hang up if the page is closed or this provider goes away mid-call.
  useEffect(() => {
    const hangUp = () => {
      const { status, call } = stateRef.current;
      if (status !== "idle" && status !== "ended" && call?.callId) {
        socket.emit("call:end", { callId: call.callId });
      }
    };
    window.addEventListener("pagehide", hangUp);
    return () => {
      window.removeEventListener("pagehide", hangUp);
      hangUp();
      peerRef.current?.close();
    };
  }, [socket]);

  const value = useMemo<CallContextValue>(
    () => ({
      state,
      localStream,
      remoteStream,
      startCall,
      acceptCall,
      declineCall,
      endCall,
      toggleMute,
      toggleCamera,
      setMinimized,
    }),
    [
      state,
      localStream,
      remoteStream,
      startCall,
      acceptCall,
      declineCall,
      endCall,
      toggleMute,
      toggleCamera,
      setMinimized,
    ]
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      <CallOverlay />
    </CallContext.Provider>
  );
}
