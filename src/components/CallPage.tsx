"use client";

import React, { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface CallState {
  isIncoming: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  hasLocalStream: boolean;
  hasRemoteStream: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  error: string | null;
}

const CallPage_ = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const socket = useSocket();
  const { userdata } = useUser();
  const { toast } = useToast();

  // Call parameters
  const roomId = searchParams?.get("id");
  const isIncoming = searchParams?.get("accept") === "true";
  const callerId = searchParams?.get("from");

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // State
  const [callState, setCallState] = useState<CallState>({
    isIncoming,
    isConnected: false,
    isConnecting: false,
    hasLocalStream: false,
    hasRemoteStream: false,
    isMuted: false,
    isVideoOff: false,
    error: null,
  });

  // Initialize WebRTC
  const initializeWebRTC = useCallback(async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;

      // Display local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setCallState((prev) => ({ ...prev, hasLocalStream: true }));

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      peerConnectionRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setCallState((prev) => ({ ...prev, hasRemoteStream: true }));
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("webrtc:candidate", {
            room: roomId,
            candidate: event.candidate,
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        setCallState((prev) => ({
          ...prev,
          isConnected: state === "connected",
          isConnecting: state === "connecting",
        }));

        if (state === "connected") {
          toast({
            title: "Call Connected",
            description: "You are now connected to the call",
          });
        } else if (state === "failed") {
          setCallState((prev) => ({ ...prev, error: "Connection failed" }));
        }
      };

      return pc;
    } catch (error) {
      console.error("Failed to initialize WebRTC:", error);
      setCallState((prev) => ({
        ...prev,
        error: "Failed to access camera/microphone",
      }));
      return null;
    }
  }, [roomId, socket, toast]);

  // Start call (for caller)
  const startCall = useCallback(async () => {
    if (!roomId || !socket) return;

    setCallState((prev) => ({ ...prev, isConnecting: true }));

    const pc = await initializeWebRTC();
    if (!pc) return;

    try {
      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("webrtc:offer", {
        room: roomId,
        offer,
        from: userdata._id,
      });

      toast({
        title: "Calling...",
        description: "Waiting for the other person to answer",
      });
    } catch (error) {
      console.error("Failed to start call:", error);
      setCallState((prev) => ({ ...prev, error: "Failed to start call" }));
    }
  }, [roomId, socket, userdata._id, initializeWebRTC, toast]);

  // Answer call (for callee)
  const answerCall = useCallback(async () => {
    if (!roomId || !socket) return;

    setCallState((prev) => ({ ...prev, isConnecting: true }));

    const pc = await initializeWebRTC();
    if (!pc) return;

    try {
      // Join the room
      socket.emit("join-room", roomId);

      toast({
        title: "Joining Call",
        description: "Connecting to the call...",
      });
    } catch (error) {
      console.error("Failed to answer call:", error);
      setCallState((prev) => ({ ...prev, error: "Failed to join call" }));
    }
  }, [roomId, socket, initializeWebRTC, toast]);

  // Handle incoming offer
  const handleOffer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      if (!peerConnectionRef.current) return;

      try {
        await peerConnectionRef.current.setRemoteDescription(offer);
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        socket?.emit("webrtc:answer", {
          room: roomId,
          answer,
        });
      } catch (error) {
        console.error("Failed to handle offer:", error);
      }
    },
    [roomId, socket]
  );

  // Handle incoming answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(answer);
    } catch (error) {
      console.error("Failed to handle answer:", error);
    }
  }, []);

  // Handle ICE candidates
  const handleCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.addIceCandidate(candidate);
    } catch (error) {
      console.error("Failed to add ICE candidate:", error);
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState((prev) => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState((prev) => ({ ...prev, isVideoOff: !videoTrack.enabled }));
      }
    }
  }, []);

  // End call
  const endCall = useCallback(() => {
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Emit hangup
    if (socket && roomId) {
      socket.emit("webrtc:hangup", { room: roomId });
    }

    // Navigate back
    router.push("/home");
  }, [socket, roomId, router]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on("webrtc:offer", ({ offer }) => {
      handleOffer(offer);
    });

    socket.on("webrtc:answer", ({ answer }) => {
      handleAnswer(answer);
    });

    socket.on("webrtc:candidate", ({ candidate }) => {
      handleCandidate(candidate);
    });

    socket.on("webrtc:hangup", () => {
      toast({
        title: "Call Ended",
        description: "The other person ended the call",
      });
      endCall();
    });

    return () => {
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:candidate");
      socket.off("webrtc:hangup");
    };
  }, [socket, handleOffer, handleAnswer, handleCandidate, endCall, toast]);

  // Initialize call based on type
  useEffect(() => {
    if (callState.hasLocalStream) {
      if (isIncoming) {
        answerCall();
      } else {
        startCall();
      }
    }
  }, [callState.hasLocalStream, isIncoming, startCall, answerCall]);

  // Auto-initialize for incoming calls
  useEffect(() => {
    if (isIncoming) {
      initializeWebRTC();
    }
  }, [isIncoming, initializeWebRTC]);

  if (!roomId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Invalid Call</h2>
            <p className="text-muted-foreground mb-4">No room ID provided for the call.</p>
            <Button onClick={() => router.push("/home")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Badge variant={callState.isConnected ? "default" : "secondary"}>
              {callState.isConnected
                ? "Connected"
                : callState.isConnecting
                  ? "Connecting..."
                  : "Disconnected"}
            </Badge>
            {callState.error && <Badge variant="destructive">{callState.error}</Badge>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={endCall}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="relative h-full">
        {/* Remote Video */}
        {callState.hasRemoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {isIncoming ? "Incoming Call" : "Calling..."}
              </h3>
              <p className="text-gray-400">
                {callState.isConnecting ? "Connecting..." : "Waiting for connection"}
              </p>
            </div>
          </div>
        )}

        {/* Local Video */}
        {callState.hasLocalStream && (
          <div className="absolute top-20 right-4 w-32 h-24 bg-black rounded-lg overflow-hidden border-2 border-white/20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-gradient-to-t from-black/50 to-transparent">
        <div className="flex items-center justify-center space-x-4">
          {/* Audio Toggle */}
          <Button
            size="icon"
            variant={callState.isMuted ? "destructive" : "default"}
            onClick={toggleAudio}
            className="w-12 h-12 rounded-full"
          >
            {callState.isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {/* End Call */}
          <Button
            size="icon"
            variant="destructive"
            onClick={endCall}
            className="w-16 h-16 rounded-full"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>

          {/* Video Toggle */}
          <Button
            size="icon"
            variant={callState.isVideoOff ? "destructive" : "default"}
            onClick={toggleVideo}
            className="w-12 h-12 rounded-full"
          >
            {callState.isVideoOff ? (
              <VideoOff className="h-5 w-5" />
            ) : (
              <Video className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function CallPage() {
  return (
    <Suspense fallback={<></>}>
      <CallPage_ />
    </Suspense>
  );
}
