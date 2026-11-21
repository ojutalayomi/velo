import type { Socket } from "socket.io-client";

import type { CallType } from "./callState";

export class CallPermissionError extends Error {
  constructor(message = "Microphone or camera access was denied") {
    super(message);
    this.name = "CallPermissionError";
  }
}

const FALLBACK_ICE: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302"] }];
let iceCache: { servers: RTCIceServer[]; at: number } | null = null;
const ICE_TTL_MS = 5 * 60 * 1000;

/** STUN plus the TURN relay configured on the server (see /api/call/ice). */
export async function getIceServers(): Promise<RTCIceServer[]> {
  if (iceCache && Date.now() - iceCache.at < ICE_TTL_MS) return iceCache.servers;
  try {
    const res = await fetch("/api/call/ice", { cache: "no-store" });
    if (res.ok) {
      const { iceServers } = (await res.json()) as { iceServers?: RTCIceServer[] };
      if (iceServers?.length) {
        iceCache = { servers: iceServers, at: Date.now() };
        return iceServers;
      }
    }
  } catch {
    // fall through to public STUN only
  }
  return FALLBACK_ICE;
}

export type MediaDevice = "camera" | "microphone";

/** Another media problem (device busy, missing, ...), as opposed to a permission refusal. */
export class CallMediaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CallMediaError";
  }
}

/** Turns a getUserMedia failure into something a person can act on. */
export function describeMediaError(error: unknown, device: MediaDevice): { message: string; permission: boolean } {
  const name = (error as DOMException)?.name;
  const detail = String((error as DOMException)?.message ?? "");
  const what = device === "camera" ? "camera" : "microphone";
  switch (name) {
    case "NotAllowedError":
      return {
        permission: true,
        message: /system/i.test(detail)
          ? `Your device is blocking the browser from using the ${what}. Allow it in your system privacy settings, then try again.`
          : `The ${what} is blocked for this site. Allow it from the site settings next to the address bar, then try again.`,
      };
    case "SecurityError":
      return {
        permission: true,
        message: `The ${what} can't be used here. Calls need a secure (https) page that isn't blocking it.`,
      };
    case "NotFoundError":
    case "OverconstrainedError":
      return { permission: false, message: `No ${what} was found on this device.` };
    case "NotReadableError":
    case "AbortError":
      return {
        permission: false,
        message: `The ${what} is in use by another app or tab. Close it and try again.`,
      };
    default:
      return { permission: false, message: `Couldn't start the ${what}${detail ? `: ${detail}` : "."}` };
  }
}

/** Which of the two devices a failed request is about, found by trying the microphone alone. */
async function failingDevice(): Promise<MediaDevice> {
  try {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
    probe.getTracks().forEach((track) => track.stop());
    return "camera"; // the microphone works, so the camera is the problem
  } catch {
    return "microphone";
  }
}

/** Audio calls only ever request the microphone; the camera is requested for video calls alone. */
export async function acquireLocalMedia(callType: CallType): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CallPermissionError("Calls need a secure (https) page and a browser that supports them.");
  }
  const audio = { echoCancellation: true, noiseSuppression: true };
  const attempts: MediaStreamConstraints[] =
    callType === "video"
      ? [
          { audio, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } },
          { audio, video: true }, // some devices reject the ideal constraints
        ]
      : [{ audio, video: false }];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
      const name = (error as DOMException)?.name;
      // Only a constraint problem is worth retrying with simpler constraints.
      if (name !== "OverconstrainedError" && name !== "TypeError") break;
    }
  }

  console.warn("[call] getUserMedia failed:", lastError);
  const device = callType === "video" ? await failingDevice() : "microphone";
  const { message, permission } = describeMediaError(lastError, device);
  throw permission ? new CallPermissionError(message) : new CallMediaError(message);
}

export type LinkState = "connected" | "failed";

export interface PeerLinkOptions {
  socket: Socket;
  callId: string;
  /** The other participant this connection goes to. */
  remoteUserId: string;
  localStream: MediaStream;
  iceServers: RTCIceServer[];
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onState: (userId: string, state: LinkState) => void;
}

/**
 * One WebRTC connection between us and one other participant. A call with N people is N-1 of
 * these (a mesh). The person who joins sends the offers, so there is never an offer collision.
 */
export class PeerLink {
  private readonly pc: RTCPeerConnection;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private closed = false;
  private connectedEmitted = false;

  constructor(private readonly options: PeerLinkOptions) {
    const { localStream, iceServers, remoteUserId, socket, callId } = options;
    const pc = new RTCPeerConnection({ iceServers });
    this.pc = pc;

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    const remote = new MediaStream();
    pc.ontrack = (event) => {
      for (const track of (event.streams[0] ?? remote).getTracks()) {
        if (!remote.getTracks().includes(track)) remote.addTrack(track);
      }
      options.onRemoteStream(remoteUserId, remote);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:candidate", {
          callId,
          to: remoteUserId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.closed) return;
      if (pc.connectionState === "connected" && !this.connectedEmitted) {
        this.connectedEmitted = true;
        options.onState(remoteUserId, "connected");
      } else if (pc.connectionState === "failed") {
        options.onState(remoteUserId, "failed");
      }
    };
  }

  /** Joiner side: offer to someone already in the call. */
  async createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.options.socket.emit("webrtc:offer", {
      callId: this.options.callId,
      to: this.options.remoteUserId,
      offer: this.pc.localDescription,
    });
  }

  /** Existing-participant side: answer a newcomer's offer. */
  async handleOffer(offer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(offer);
    await this.flushCandidates();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.options.socket.emit("webrtc:answer", {
      callId: this.options.callId,
      to: this.options.remoteUserId,
      answer: this.pc.localDescription,
    });
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (this.pc.signalingState !== "have-local-offer") return;
    await this.pc.setRemoteDescription(answer);
    await this.flushCandidates();
  }

  async addCandidate(candidate: RTCIceCandidateInit) {
    // Candidates can outrun the offer/answer; hold them until a remote description exists.
    if (!this.pc.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(candidate);
    } catch (error) {
      if (!this.closed) console.warn("[call] could not add ICE candidate", error);
    }
  }

  private async flushCandidates() {
    const queued = this.pendingCandidates.splice(0);
    for (const candidate of queued) await this.addCandidate(candidate);
  }

  close() {
    this.closed = true;
    this.pc.ontrack = null;
    this.pc.onicecandidate = null;
    this.pc.onconnectionstatechange = null;
    this.pc.close();
    this.pendingCandidates = [];
  }
}
