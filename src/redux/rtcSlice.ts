import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

// Enums for better type safety
export enum RTCConnectionStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  FAILED = "failed",
  CLOSED = "closed",
}

// Extended interface for error tracking
interface RTCError {
  message: string;
  timestamp: number;
  code?: string;
}

// Extended state interface with additional properties
interface RTCState {
  peerConnection: RTCPeerConnection | null;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  iceGatheringState: RTCIceGatheringState;
  signalingState: RTCSignalingState;
  iceCandidates: RTCIceCandidateInit[];
  remoteDescription: RTCSessionDescriptionInit | null;
  localDescription: RTCSessionDescriptionInit | null;
  isInitiator: boolean;
  lastError: RTCError | null;
  connectionAttempts: number;
  connectedAt: number | null;
  reconnecting: boolean;
}

const initialState: RTCState = {
  peerConnection: null,
  connectionState: "new",
  iceConnectionState: "new",
  iceGatheringState: "new",
  signalingState: "stable",
  iceCandidates: [],
  remoteDescription: null,
  localDescription: null,
  isInitiator: false,
  lastError: null,
  connectionAttempts: 0,
  connectedAt: null,
  reconnecting: false,
};

const rtcSlice = createSlice({
  name: "rtc",
  initialState,
  reducers: {
    setPeerConnection: (state, action: PayloadAction<RTCPeerConnection | null>) => {
      state.peerConnection = action.payload;
      if (action.payload === null) {
        // Reset related states when connection is cleared
        state.connectionState = "new";
        state.iceConnectionState = "new";
        state.iceGatheringState = "new";
        state.signalingState = "stable";
        state.localDescription = null;
        state.remoteDescription = null;
        state.connectedAt = null;
        state.reconnecting = false;
      }
    },
    setConnectionState: (state, action: PayloadAction<RTCPeerConnectionState>) => {
      state.connectionState = action.payload;

      if (action.payload === "connected") {
        state.connectedAt = Date.now();
        state.connectionAttempts = 0;
        state.reconnecting = false;
        state.lastError = null;
      } else if (action.payload === "failed" || action.payload === "disconnected") {
        state.connectionAttempts += 1;
        state.reconnecting = true;
      }
    },
    setIceConnectionState: (state, action: PayloadAction<RTCIceConnectionState>) => {
      state.iceConnectionState = action.payload;
    },
    setIceGatheringState: (state, action: PayloadAction<RTCIceGatheringState>) => {
      state.iceGatheringState = action.payload;
    },
    setSignalingState: (state, action: PayloadAction<RTCSignalingState>) => {
      state.signalingState = action.payload;
    },
    addIceCandidate: (state, action: PayloadAction<RTCIceCandidateInit>) => {
      state.iceCandidates.push(action.payload);
    },
    clearIceCandidates: (state) => {
      state.iceCandidates = [];
    },
    setRemoteDescription: (state, action: PayloadAction<RTCSessionDescriptionInit | null>) => {
      state.remoteDescription = action.payload;
    },
    setLocalDescription: (state, action: PayloadAction<RTCSessionDescriptionInit | null>) => {
      state.localDescription = action.payload;
    },
    setIsInitiator: (state, action: PayloadAction<boolean>) => {
      state.isInitiator = action.payload;
    },
    setError: (state, action: PayloadAction<RTCError>) => {
      state.lastError = {
        ...action.payload,
        timestamp: Date.now(),
      };
    },
    clearError: (state) => {
      state.lastError = null;
    },
    resetConnection: (state) => {
      return {
        ...initialState,
        connectionAttempts: state.connectionAttempts + 1,
      };
    },
  },
});

export const {
  setPeerConnection,
  setConnectionState,
  setIceConnectionState,
  setIceGatheringState,
  setSignalingState,
  addIceCandidate,
  clearIceCandidates,
  setRemoteDescription,
  setLocalDescription,
  setIsInitiator,
  setError,
  clearError,
  resetConnection,
} = rtcSlice.actions;

// Enhanced selectors with memoization opportunities
export const selectPeerConnection = (state: RootState) => state.rtc.peerConnection;
export const selectConnectionState = (state: RootState) => state.rtc.connectionState;
export const selectIceConnectionState = (state: RootState) => state.rtc.iceConnectionState;
export const selectIceGatheringState = (state: RootState) => state.rtc.iceGatheringState;
export const selectSignalingState = (state: RootState) => state.rtc.signalingState;
export const selectIceCandidates = (state: RootState) => state.rtc.iceCandidates;
export const selectRemoteDescription = (state: RootState) => state.rtc.remoteDescription;
export const selectLocalDescription = (state: RootState) => state.rtc.localDescription;
export const selectIsInitiator = (state: RootState) => state.rtc.isInitiator;
export const selectLastError = (state: RootState) => state.rtc.lastError;
export const selectConnectionAttempts = (state: RootState) => state.rtc.connectionAttempts;
export const selectIsReconnecting = (state: RootState) => state.rtc.reconnecting;
export const selectConnectedAt = (state: RootState) => state.rtc.connectedAt;

// Computed selectors
export const selectConnectionDuration = (state: RootState) => {
  const connectedAt = state.rtc.connectedAt;
  return connectedAt ? Date.now() - connectedAt : null;
};

export const selectConnectionStatus = (state: RootState): RTCConnectionStatus => {
  const connectionState = state.rtc.connectionState;
  const iceConnectionState = state.rtc.iceConnectionState;

  if (connectionState === "connected" && iceConnectionState === "connected") {
    return RTCConnectionStatus.CONNECTED;
  } else if (connectionState === "failed" || iceConnectionState === "failed") {
    return RTCConnectionStatus.FAILED;
  } else if (connectionState === "closed") {
    return RTCConnectionStatus.CLOSED;
  } else if (state.rtc.reconnecting) {
    return RTCConnectionStatus.DISCONNECTED;
  } else {
    return RTCConnectionStatus.CONNECTING;
  }
};

export default rtcSlice.reducer;
