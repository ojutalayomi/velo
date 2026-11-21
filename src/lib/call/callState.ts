export type CallType = "audio" | "video";
export type CallChatType = "DM" | "Group";

export type CallStatus =
  | "idle"
  | "outgoing" // we are ringing someone
  | "incoming" // someone is ringing us
  | "connecting" // answered, negotiating media
  | "connected"
  | "ended"; // brief "call ended" screen

export type CallEndReason =
  | "hangup"
  | "declined"
  | "timeout"
  | "busy"
  | "already-in-call"
  | "failed"
  | "permission-denied";

export interface CallPeerInfo {
  id?: string;
  name: string;
  avatar?: string;
}

export interface ActiveCallInfo {
  callId: string | null;
  roomId: string;
  chatType: CallChatType;
  callType: CallType;
  direction: "outgoing" | "incoming";
  peer: CallPeerInfo;
}

export interface CallState {
  status: CallStatus;
  call: ActiveCallInfo | null;
  muted: boolean;
  cameraOff: boolean;
  minimized: boolean;
  /** When the media connection came up, for the duration timer. */
  connectedAt: number | null;
  endReason: CallEndReason | null;
}

export const initialCallState: CallState = {
  status: "idle",
  call: null,
  muted: false,
  cameraOff: false,
  minimized: false,
  connectedAt: null,
  endReason: null,
};

export type CallAction =
  | { type: "outgoing"; call: ActiveCallInfo }
  | { type: "initiated"; callId: string }
  | { type: "incoming"; call: ActiveCallInfo }
  | { type: "accepted" } // we answered, or the other side answered
  | { type: "connected"; at: number }
  | { type: "ended"; reason: CallEndReason }
  | { type: "reset" }
  | { type: "toggleMute" }
  | { type: "toggleCamera" }
  | { type: "setMinimized"; value: boolean };

export function callReducer(state: CallState, action: CallAction): CallState {
  switch (action.type) {
    case "outgoing":
      return { ...initialCallState, status: "outgoing", call: action.call };
    case "incoming":
      return { ...initialCallState, status: "incoming", call: action.call };
    case "initiated":
      return state.call ? { ...state, call: { ...state.call, callId: action.callId } } : state;
    case "accepted":
      return state.status === "outgoing" || state.status === "incoming"
        ? { ...state, status: "connecting" }
        : state;
    case "connected":
      return state.status === "connecting" || state.status === "outgoing"
        ? { ...state, status: "connected", connectedAt: action.at }
        : state;
    case "ended":
      return state.status === "idle" || state.status === "ended"
        ? state
        : { ...state, status: "ended", endReason: action.reason, minimized: false };
    case "reset":
      return initialCallState;
    case "toggleMute":
      return { ...state, muted: !state.muted };
    case "toggleCamera":
      return state.call?.callType === "video" ? { ...state, cameraOff: !state.cameraOff } : state;
    case "setMinimized":
      return { ...state, minimized: action.value };
  }
}

export function endReasonLabel(reason: CallEndReason | null, direction?: "outgoing" | "incoming") {
  switch (reason) {
    case "declined":
      return "Call declined";
    case "timeout":
      return direction === "incoming" ? "Missed call" : "No answer";
    case "busy":
      return "User is busy";
    case "already-in-call":
      return "You are already in a call";
    case "permission-denied":
      return "Microphone or camera access was denied";
    case "failed":
      return "Call failed";
    default:
      return "Call ended";
  }
}

export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm}:${ss}` : `${mm}:${ss}`;
}
