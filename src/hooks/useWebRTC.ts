import { useCallback, useRef, useState } from "react";

export interface WebRTCState {
  isConnected: boolean;
  isConnecting: boolean;
  hasLocalStream: boolean;
  hasRemoteStream: boolean;
  error: string | null;
}

export interface WebRTCActions {
  initialize: () => Promise<MediaStream | null>;
  createOffer: () => Promise<RTCSessionDescriptionInit | null>;
  createAnswer: () => Promise<RTCSessionDescriptionInit | null>;
  setRemoteDescription: (description: RTCSessionDescriptionInit) => Promise<void>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  cleanup: () => void;
}

export const useWebRTC = (
  roomId: string,
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void,
  onTrack?: (stream: MediaStream) => void
): [WebRTCState, WebRTCActions, RTCPeerConnection | null] => {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<WebRTCState>({
    isConnected: false,
    isConnecting: false,
    hasLocalStream: false,
    hasRemoteStream: false,
    error: null,
  });

  // Initialize WebRTC
  const initialize = useCallback(async (): Promise<MediaStream | null> => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      setState((prev) => ({ ...prev, hasLocalStream: true, error: null }));

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
        if (event.streams[0]) {
          setState((prev) => ({ ...prev, hasRemoteStream: true }));
          onTrack?.(event.streams[0]);
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && onIceCandidate) {
          onIceCandidate(event.candidate);
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        const connectionState = pc.connectionState;
        setState((prev) => ({
          ...prev,
          isConnected: connectionState === "connected",
          isConnecting: connectionState === "connecting",
        }));
      };

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState;
        if (iceState === "failed") {
          setState((prev) => ({ ...prev, error: "ICE connection failed" }));
        }
      };

      return stream;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to initialize WebRTC";
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [onIceCandidate, onTrack]);

  // Create offer
  const createOffer = useCallback(async (): Promise<RTCSessionDescriptionInit | null> => {
    if (!peerConnectionRef.current) return null;

    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      return offer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create offer";
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  // Create answer
  const createAnswer = useCallback(async (): Promise<RTCSessionDescriptionInit | null> => {
    if (!peerConnectionRef.current) return null;

    try {
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      return answer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create answer";
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  // Set remote description
  const setRemoteDescription = useCallback(
    async (description: RTCSessionDescriptionInit): Promise<void> => {
      if (!peerConnectionRef.current) return;

      try {
        await peerConnectionRef.current.setRemoteDescription(description);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to set remote description";
        setState((prev) => ({ ...prev, error: errorMessage }));
      }
    },
    []
  );

  // Add ICE candidate
  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit): Promise<void> => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.addIceCandidate(candidate);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add ICE candidate";
      setState((prev) => ({ ...prev, error: errorMessage }));
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setState({
      isConnected: false,
      isConnecting: false,
      hasLocalStream: false,
      hasRemoteStream: false,
      error: null,
    });
  }, []);

  const actions: WebRTCActions = {
    initialize,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    toggleAudio,
    toggleVideo,
    cleanup,
  };

  return [state, actions, peerConnectionRef.current];
};
