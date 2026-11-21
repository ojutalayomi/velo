import type { Socket } from "socket.io-client";

import type { CallType } from "./callState";

export class CallPermissionError extends Error {
  constructor(message = "Microphone or camera access was denied") {
    super(message);
    this.name = "CallPermissionError";
  }
}

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  // Optional TURN relay for networks where direct connections fail.
  const url = process.env.NEXT_PUBLIC_TURN_URL;
  if (url) {
    servers.push({
      urls: url.split(","),
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

export interface CallPeerEvents {
  onRemoteStream: (stream: MediaStream) => void;
  onConnected: () => void;
  onFailed: () => void;
}

/**
 * One WebRTC connection for one call. Audio calls only ever request the microphone;
 * the camera is requested for video calls alone.
 */
export class CallPeer {
  private pc: RTCPeerConnection | null = null;
  private local: MediaStream | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private closed = false;
  private connectedEmitted = false;

  constructor(
    private readonly socket: Socket,
    private readonly callType: CallType,
    private readonly events: CallPeerEvents
  ) {}

  get localStream() {
    return this.local;
  }

  /** The signalling channel only knows the call after the server assigns an id. */
  private callId: string | null = null;
  setCallId(callId: string) {
    this.callId = callId;
  }

  /** Requests media; throws CallPermissionError if the user refuses. */
  async acquireMedia() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new CallPermissionError("Calls are not supported in this browser");
    }
    try {
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video:
          this.callType === "video"
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
            : false,
      });
    } catch (error) {
      const name = (error as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError" || name === "NotFoundError") {
        throw new CallPermissionError(
          name === "NotFoundError"
            ? this.callType === "video"
              ? "No camera or microphone was found"
              : "No microphone was found"
            : undefined
        );
      }
      throw error;
    }
    return this.local;
  }

  private ensureConnection() {
    if (this.pc) return this.pc;
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    this.pc = pc;

    this.local?.getTracks().forEach((track) => pc.addTrack(track, this.local!));

    const remote = new MediaStream();
    pc.ontrack = (event) => {
      (event.streams[0] ?? remote).getTracks().forEach((track) => {
        if (!remote.getTracks().includes(track)) remote.addTrack(track);
      });
      this.events.onRemoteStream(remote);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && this.callId) {
        this.socket.emit("webrtc:candidate", {
          callId: this.callId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.closed) return;
      if (pc.connectionState === "connected" && !this.connectedEmitted) {
        this.connectedEmitted = true;
        this.events.onConnected();
      } else if (pc.connectionState === "failed") {
        this.events.onFailed();
      }
    };

    return pc;
  }

  /** Caller side: runs after the callee accepted. */
  async createOffer() {
    const pc = this.ensureConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.socket.emit("webrtc:offer", { callId: this.callId, offer: pc.localDescription });
  }

  /** Callee side. */
  async handleOffer(offer: RTCSessionDescriptionInit) {
    const pc = this.ensureConnection();
    await pc.setRemoteDescription(offer);
    await this.flushCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.socket.emit("webrtc:answer", { callId: this.callId, answer: pc.localDescription });
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    const pc = this.pc;
    if (!pc || pc.signalingState !== "have-local-offer") return;
    await pc.setRemoteDescription(answer);
    await this.flushCandidates();
  }

  async addCandidate(candidate: RTCIceCandidateInit) {
    // Candidates can outrun the offer/answer; hold them until a remote description exists.
    if (!this.pc || !this.pc.remoteDescription) {
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

  setMuted(muted: boolean) {
    this.local?.getAudioTracks().forEach((track) => (track.enabled = !muted));
  }

  setCameraOff(off: boolean) {
    this.local?.getVideoTracks().forEach((track) => (track.enabled = !off));
  }

  close() {
    this.closed = true;
    this.local?.getTracks().forEach((track) => track.stop());
    this.local = null;
    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.onconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }
    this.pendingCandidates = [];
  }
}
