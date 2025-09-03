import { io, Socket } from 'socket.io-client';

export interface CallData {
  callId: string;
  roomId: string;
  callerId: string;
  targetUserId?: string;
  callType: 'audio' | 'video';
  chatType: 'DMs' | 'Groups';
}

export interface WebRTCOffer {
  callId: string;
  offer: RTCSessionDescriptionInit;
}

export interface WebRTCAnswer {
  callId: string;
  answer: RTCSessionDescriptionInit;
}

export interface WebRTCCandidate {
  callId: string;
  candidate: RTCIceCandidateInit;
}

export class WebRTCManager {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCallId: string | null = null;
  private isInitiator: boolean = false;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onCallStateChange: ((state: string) => void) | null = null;

  constructor(socket: Socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // WebRTC signaling events
    this.socket.on('webrtc:offer', this.handleOffer.bind(this));
    this.socket.on('webrtc:answer', this.handleAnswer.bind(this));
    this.socket.on('webrtc:candidate', this.handleCandidate.bind(this));

    // Call state events
    this.socket.on('call:initiated', this.handleCallInitiated.bind(this));
    this.socket.on('call:answered', this.handleCallAnswered.bind(this));
    this.socket.on('call:connected', this.handleCallConnected.bind(this));
    this.socket.on('call:ended', this.handleCallEnded.bind(this));
    this.socket.on('call:declined', this.handleCallDeclined.bind(this));
  }

  async initiateCall(callData: CallData): Promise<string> {
    if (!this.socket) throw new Error('Socket not connected');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Call initiation timeout'));
      }, 30000); // 30 second timeout

      this.socket!.emit('call:invite', callData);
      
      // The call:initiated event will be handled by setupSocketListeners
      // We'll resolve when the currentCallId is set
      const checkInterval = setInterval(() => {
        if (this.currentCallId) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve(this.currentCallId);
        }
      }, 100);
    });
  }

  async answerCall(callId: string, accepted: boolean): Promise<void> {
    if (!this.socket) throw new Error('Socket not connected');

    this.socket.emit('call:answer', { callId, accepted });
    
    if (accepted) {
      this.currentCallId = callId;
      this.isInitiator = false;
    }
  }

  async endCall(): Promise<void> {
    if (!this.socket || !this.currentCallId) return;

    this.socket.emit('call:end', { callId: this.currentCallId });
    this.cleanup();
  }

  async hangupCall(roomId: string): Promise<void> {
    if (!this.socket) return;

    // Legacy hangup for compatibility
    this.socket.emit('call:hangup', { roomId });
    
    // Also end the call if we have a call ID
    if (this.currentCallId) {
      this.socket.emit('call:end', { callId: this.currentCallId });
    }
    
    this.cleanup();
  }

  private async handleOffer(data: WebRTCOffer) {
    if (!this.peerConnection || data.callId !== this.currentCallId) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket?.emit('webrtc:answer', {
        callId: data.callId,
        answer: answer
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  private async handleAnswer(data: WebRTCAnswer) {
    if (!this.peerConnection || data.callId !== this.currentCallId) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  private async handleCandidate(data: WebRTCCandidate) {
    if (!this.peerConnection || data.callId !== this.currentCallId) return;

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Error handling candidate:', error);
    }
  }

  private handleCallInitiated(data: { callId: string; roomId: string }) {
    this.currentCallId = data.callId;
    this.isInitiator = true;
    
    // Join the call room for WebRTC signaling
    if (this.socket) {
      this.socket.emit('join-room', data.callId);
    }
    
    this.onCallStateChange?.('connecting');
    console.log('Call initiated:', data.callId);
  }

  private handleCallAnswered(data: { callId: string }) {
    this.currentCallId = data.callId;
    this.isInitiator = false;
    
    // Join the call room for WebRTC signaling
    if (this.socket) {
      this.socket.emit('join-room', data.callId);
    }
    
    // Don't emit 'connecting' again - caller is already connecting
    // Just wait for the 'call:connected' event
    console.log('Call answered:', data.callId);
  }

  private handleCallConnected(data: { callId: string; participants: string[] }) {
    if (data.callId !== this.currentCallId) return;
    
    this.onCallStateChange?.('connected');
    console.log('Call connected with participants:', data.participants);
  }

  private handleCallEnded(data: { callId: string }) {
    if (data.callId !== this.currentCallId) return;
    
    this.onCallStateChange?.('ended');
    this.cleanup();
  }

  private handleCallDeclined(data: { callId: string }) {
    if (data.callId !== this.currentCallId) return;
    
    this.onCallStateChange?.('declined');
    this.cleanup();
  }

  async setupPeerConnection(callType: 'audio' | 'video'): Promise<void> {
    try {
      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local stream tracks
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        this.onRemoteStream?.(this.remoteStream);
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket && this.currentCallId) {
          this.socket.emit('webrtc:candidate', {
            callId: this.currentCallId,
            candidate: event.candidate
          });
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        this.onCallStateChange?.(state || 'unknown');
        
        if (state === 'failed' || state === 'disconnected') {
          this.cleanup();
        }
      };

      // If we're the initiator, create and send offer
      if (this.isInitiator && this.currentCallId) {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        this.socket?.emit('webrtc:offer', {
          callId: this.currentCallId,
          offer: offer
        });
      }
    } catch (error) {
      console.error('Error setting up peer connection:', error);
      throw error;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  setOnRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStream = callback;
  }

  setOnCallStateChange(callback: (state: string) => void) {
    this.onCallStateChange = callback;
  }

  isCallActive(): boolean {
    return this.currentCallId !== null && this.peerConnection !== null;
  }

  getCurrentCallId(): string | null {
    return this.currentCallId;
  }

  private cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Reset state
    this.currentCallId = null;
    this.isInitiator = false;
    this.remoteStream = null;
    
    this.onCallStateChange?.('idle');
  }

  destroy() {
    this.cleanup();
    this.socket = null;
  }
}

// Utility functions
export const createWebRTCManager = (socket: Socket): WebRTCManager => {
  return new WebRTCManager(socket);
};

export const getCallTypeFromConstraints = (constraints: MediaStreamConstraints): 'audio' | 'video' => {
  return constraints.video ? 'video' : 'audio';
};
