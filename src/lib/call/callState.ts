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
  | "full"
  | "group-call-active"
  | "already-in-call"
  | "failed"
  | "permission-denied";

export interface CallPeerInfo {
  id?: string;
  name: string;
  avatar?: string;
}

export interface CallParticipant {
  name: string;
  avatar?: string;
  /** Media connection to this person is up. */
  connected: boolean;
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
  /** Everyone else in the call, by user id. */
  participants: Record<string, CallParticipant>;
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
  participants: {},
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
  /** We pressed accept / join and are getting media ready. */
  | { type: "accepting" }
  /** The server confirmed we joined; `participants` are the people already there. */
  | { type: "joined"; participants: { userId: string; name: string; avatar?: string }[] }
  | { type: "peerJoined"; user: { userId: string; name: string; avatar?: string } }
  | { type: "peerLeft"; userId: string }
  | { type: "peerConnected"; userId: string; at: number }
  | { type: "ended"; reason: CallEndReason }
  | { type: "reset" }
  | { type: "toggleMute" }
  | { type: "toggleCamera" }
  | { type: "setMinimized"; value: boolean };

const toParticipant = (user: { name: string; avatar?: string }): CallParticipant => ({
  name: user.name,
  avatar: user.avatar,
  connected: false,
});

export function callReducer(state: CallState, action: CallAction): CallState {
  switch (action.type) {
    case "outgoing":
      return { ...initialCallState, status: "outgoing", call: action.call };
    case "incoming":
      return { ...initialCallState, status: "incoming", call: action.call };
    case "initiated":
      return state.call ? { ...state, call: { ...state.call, callId: action.callId } } : state;
    case "accepting":
      return state.status === "incoming" ? { ...state, status: "connecting" } : state;
    case "joined": {
      if (state.status !== "connecting") return state;
      const participants = { ...state.participants };
      for (const user of action.participants) {
        participants[user.userId] = participants[user.userId] ?? toParticipant(user);
      }
      return { ...state, participants };
    }
    case "peerJoined": {
      if (state.status === "idle" || state.status === "ended" || state.status === "incoming") {
        return state;
      }
      return {
        ...state,
        // The first person to join moves a ringing outgoing call on to negotiating media.
        status: state.status === "outgoing" ? "connecting" : state.status,
        participants: {
          ...state.participants,
          [action.user.userId]: state.participants[action.user.userId] ?? toParticipant(action.user),
        },
      };
    }
    case "peerLeft": {
      if (!(action.userId in state.participants)) return state;
      const { [action.userId]: _left, ...rest } = state.participants;
      void _left;
      return { ...state, participants: rest };
    }
    case "peerConnected": {
      const person = state.participants[action.userId];
      if (!person || state.status === "idle" || state.status === "ended") return state;
      return {
        ...state,
        status: "connected",
        connectedAt: state.connectedAt ?? action.at,
        participants: { ...state.participants, [action.userId]: { ...person, connected: true } },
      };
    }
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
    case "full":
      return "This call is full";
    case "group-call-active":
      return "This group already has a call. Join it instead.";
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
