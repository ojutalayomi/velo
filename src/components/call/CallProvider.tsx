"use client";

import { ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";

import {
  acquireLocalMedia,
  CallPermissionError,
  getIceServers,
  PeerLink,
} from "@/lib/call/callPeer";
import {
  ActiveCallInfo,
  callReducer,
  CallChatType,
  CallEndReason,
  CallType,
  initialCallState,
} from "@/lib/call/callState";
import { startRingtone, stopRingtone } from "@/lib/call/ringtone";

import CallOverlay from "./CallOverlay";
import { CallContext, CallContextValue, GroupCallInfo, StartCallInput } from "./callContext";

const ENDED_SCREEN_MS = 2200;
/** Group invites are dismissed after a while if nobody ends the call. */
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

interface PersonPayload {
  userId: string;
  name?: string;
  avatar?: string;
}

const person = (p: PersonPayload) => ({ userId: p.userId, name: p.name || "Someone", avatar: p.avatar });

export function CallProvider({ children, socket }: { children: ReactNode; socket: Socket }) {
  const [state, dispatch] = useReducer(callReducer, initialCallState);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [groupCalls, setGroupCalls] = useState<Record<string, GroupCallInfo>>({});

  const stateRef = useRef(state);
  const localRef = useRef<MediaStream | null>(null);
  const iceRef = useRef<RTCIceServer[]>([]);
  const linksRef = useRef(new Map<string, PeerLink>());
  /** Identity of the current call attempt, to drop results that arrive after it was cancelled. */
  const sessionRef = useRef<object | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearRingTimer = () => {
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    ringTimerRef.current = null;
  };

  /** Releases the camera/microphone and every connection. Safe to call repeatedly. */
  const teardown = useCallback(() => {
    clearRingTimer();
    sessionRef.current = null;
    linksRef.current.forEach((link) => link.close());
    linksRef.current.clear();
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    setLocalStream(null);
    setRemoteStreams({});
  }, []);

  const finish = useCallback(
    (reason: CallEndReason) => {
      teardown();
      dispatch({ type: "ended", reason });
    },
    [teardown]
  );

  const dropPeer = useCallback((userId: string) => {
    linksRef.current.get(userId)?.close();
    linksRef.current.delete(userId);
    setRemoteStreams((prev) => {
      if (!(userId in prev)) return prev;
      const { [userId]: _gone, ...rest } = prev;
      void _gone;
      return rest;
    });
    dispatch({ type: "peerLeft", userId });
  }, []);

  /** The connection to one other participant, created on first use. */
  const ensureLink = useCallback(
    (userId: string): PeerLink | null => {
      const existing = linksRef.current.get(userId);
      if (existing) return existing;
      const callId = stateRef.current.call?.callId;
      const local = localRef.current;
      if (!callId || !local) return null;
      const link = new PeerLink({
        socket,
        callId,
        remoteUserId: userId,
        localStream: local,
        iceServers: iceRef.current,
        onRemoteStream: (id, stream) => setRemoteStreams((prev) => ({ ...prev, [id]: stream })),
        onState: (id, linkState) => {
          if (linkState === "connected") {
            dispatch({ type: "peerConnected", userId: id, at: Date.now() });
            return;
          }
          dropPeer(id);
          if (linksRef.current.size === 0) {
            const currentId = stateRef.current.call?.callId;
            if (currentId) socket.emit("call:end", { callId: currentId });
            finish("failed");
          }
        },
      });
      linksRef.current.set(userId, link);
      return link;
    },
    [socket, dropPeer, finish]
  );

  const startCall = useCallback(
    async (input: StartCallInput) => {
      if (stateRef.current.status !== "idle") return;
      if (!socket.connected) {
        toast.error("You are offline. Reconnect to place a call.");
        return;
      }
      const session = {};
      sessionRef.current = session;
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
      try {
        // Ask for the microphone (and camera for video) before ringing anyone.
        const [media, ice] = await Promise.all([
          acquireLocalMedia(input.callType),
          getIceServers(),
        ]);
        if (sessionRef.current !== session) {
          media.getTracks().forEach((track) => track.stop()); // cancelled during the permission prompt
          return;
        }
        localRef.current = media;
        iceRef.current = ice;
        setLocalStream(media);
      } catch (error) {
        finish(error instanceof CallPermissionError ? "permission-denied" : "failed");
        return;
      }
      socket.emit("call:invite", {
        roomId: input.roomId,
        targetUserId: input.targetUserId,
        callType: input.callType,
        chatType: input.chatType,
      });
    },
    [socket, finish]
  );

  /** Answer a DM call or join a group call: get media ready first, then tell the server. */
  const accept = useCallback(
    async (info: ActiveCallInfo) => {
      const callId = info.callId;
      if (!callId) return;
      clearRingTimer();
      const session = {};
      sessionRef.current = session;
      dispatch({ type: "accepting" });
      try {
        const [media, ice] = await Promise.all([
          acquireLocalMedia(info.callType),
          getIceServers(),
        ]);
        if (sessionRef.current !== session) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        localRef.current = media;
        iceRef.current = ice;
        setLocalStream(media);
      } catch (error) {
        socket.emit("call:answer", { callId, accepted: false });
        finish(error instanceof CallPermissionError ? "permission-denied" : "failed");
        return;
      }
      socket.emit("call:answer", { callId, accepted: true });
    },
    [socket, finish]
  );

  const acceptCall = useCallback(async () => {
    const { status, call } = stateRef.current;
    if (status !== "incoming" || !call) return;
    await accept(call);
  }, [accept]);

  const joinGroupCall = useCallback(
    async (input: { roomId: string; name: string; avatar?: string }) => {
      const live = groupCalls[input.roomId];
      if (!live || stateRef.current.status !== "idle") return;
      if (live.count >= live.max) {
        toast.error("This call is full");
        return;
      }
      const call: ActiveCallInfo = {
        callId: live.callId,
        roomId: input.roomId,
        chatType: "Group",
        callType: live.callType,
        direction: "incoming",
        peer: { name: input.name, avatar: input.avatar },
      };
      dispatch({ type: "incoming", call });
      await accept(call);
    },
    [groupCalls, accept]
  );

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
    localRef.current?.getAudioTracks().forEach((track) => (track.enabled = !state.muted));
  }, [state.muted]);
  useEffect(() => {
    localRef.current?.getVideoTracks().forEach((track) => (track.enabled = !state.cameraOff));
  }, [state.cameraOff]);

  // Ring while an incoming call waits, and play ringback while ours rings.
  useEffect(() => {
    if (state.status === "incoming") startRingtone("incoming");
    else if (state.status === "outgoing" && state.call?.callId) startRingtone("outgoing");
    else stopRingtone();
    return stopRingtone;
  }, [state.status, state.call?.callId]);

  // Server events.
  useEffect(() => {
    const matches = (callId?: string | null) =>
      !!callId && stateRef.current.call?.callId === callId;
    const fail = (callId: string) => {
      socket.emit("call:end", { callId });
      finish("failed");
    };

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
      dispatch({ type: "initiated", callId: data.callId });
    };

    // We joined: connect to everyone already in the call by sending each an offer.
    const onJoined = (data: { callId: string; participants: PersonPayload[] }) => {
      if (!matches(data.callId)) return;
      dispatch({ type: "joined", participants: data.participants.map(person) });
      for (const other of data.participants) {
        ensureLink(other.userId)
          ?.createOffer()
          .catch(() => fail(data.callId));
      }
    };

    // Someone else joined; they will send us an offer.
    const onPeerJoined = (data: { callId: string; user: PersonPayload }) => {
      if (matches(data.callId)) dispatch({ type: "peerJoined", user: person(data.user) });
    };

    const onPeerLeft = (data: { callId: string; userId: string }) => {
      if (matches(data.callId)) dropPeer(data.userId);
    };

    const onOffer = (data: { callId: string; from: string; offer: RTCSessionDescriptionInit }) => {
      if (!matches(data.callId)) return;
      ensureLink(data.from)
        ?.handleOffer(data.offer)
        .catch(() => fail(data.callId));
    };

    const onAnswer = (data: { callId: string; from: string; answer: RTCSessionDescriptionInit }) => {
      if (matches(data.callId)) void linksRef.current.get(data.from)?.handleAnswer(data.answer);
    };

    const onCandidate = (data: {
      callId: string;
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (matches(data.callId)) void ensureLink(data.from)?.addCandidate(data.candidate);
    };

    const onDeclined = (data: { callId: string }) => {
      if (matches(data.callId)) finish("declined");
    };

    const onEnded = (data: { callId: string | null; reason?: string; local?: boolean }) => {
      const { status } = stateRef.current;
      if (status === "idle" || status === "ended") return;
      // `local` rejections answer our own invite or join, which may not have an id yet.
      if (!data.local && !matches(data.callId)) return;
      const known: CallEndReason[] = [
        "timeout",
        "busy",
        "full",
        "group-call-active",
        "already-in-call",
      ];
      const reason = known.find((r) => r === data.reason) ?? "hangup";
      if (status === "incoming" && reason === "hangup") {
        teardown();
        dispatch({ type: "reset" }); // the caller cancelled before we answered
      } else {
        finish(reason);
      }
    };

    // Another device answered or declined; stop ringing here.
    const onHandled = (data: { callId: string }) => {
      if (stateRef.current.status === "incoming" && matches(data.callId)) {
        teardown();
        dispatch({ type: "reset" });
      }
    };

    const onGroupState = (data: {
      roomId: string;
      callId: string | null;
      callType?: CallType;
      count: number;
      max: number;
    }) => {
      setGroupCalls((prev) => {
        if (!data.callId || !data.callType) {
          if (!(data.roomId in prev)) return prev;
          const { [data.roomId]: _gone, ...rest } = prev;
          void _gone;
          return rest;
        }
        return {
          ...prev,
          [data.roomId]: {
            callId: data.callId,
            callType: data.callType,
            count: data.count,
            max: data.max,
          },
        };
      });
    };

    socket.on("call:invite", onInvite);
    socket.on("call:initiated", onInitiated);
    socket.on("call:joined", onJoined);
    socket.on("call:peer-joined", onPeerJoined);
    socket.on("call:peer-left", onPeerLeft);
    socket.on("webrtc:offer", onOffer);
    socket.on("webrtc:answer", onAnswer);
    socket.on("webrtc:candidate", onCandidate);
    socket.on("call:declined", onDeclined);
    socket.on("call:ended", onEnded);
    socket.on("call:handled", onHandled);
    socket.on("call:group-state", onGroupState);
    return () => {
      socket.off("call:invite", onInvite);
      socket.off("call:initiated", onInitiated);
      socket.off("call:joined", onJoined);
      socket.off("call:peer-joined", onPeerJoined);
      socket.off("call:peer-left", onPeerLeft);
      socket.off("webrtc:offer", onOffer);
      socket.off("webrtc:answer", onAnswer);
      socket.off("webrtc:candidate", onCandidate);
      socket.off("call:declined", onDeclined);
      socket.off("call:ended", onEnded);
      socket.off("call:handled", onHandled);
      socket.off("call:group-state", onGroupState);
    };
  }, [socket, finish, teardown, ensureLink, dropPeer]);

  // Leave the "call ended" screen after a moment.
  useEffect(() => {
    if (state.status !== "ended") return;
    const timer = setTimeout(() => dispatch({ type: "reset" }), ENDED_SCREEN_MS);
    return () => clearTimeout(timer);
  }, [state.status]);

  // Hang up if the page is closed or this provider goes away mid-call.
  useEffect(() => {
    const links = linksRef.current;
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
      links.forEach((link) => link.close());
      links.clear();
    };
  }, [socket]);

  const value = useMemo<CallContextValue>(
    () => ({
      state,
      localStream,
      remoteStreams,
      groupCalls,
      joinGroupCall,
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
      remoteStreams,
      groupCalls,
      joinGroupCall,
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
