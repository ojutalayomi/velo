import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  setPeerConnection, 
  setConnectionState,
  addIceCandidate,
  clearIceCandidates,
  setRemoteDescription,
  selectPeerConnection,
  selectIceCandidates,
  setIceConnectionState,
} from '@/redux/rtcSlice';
import { useSocket } from '@/app/providers';

interface WebRTCConfig {
  iceServers?: RTCIceServer[];
  room: string;
}

export class WebRTCError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'WebRTCError';
  }
}

export const useWebRTC = (config?: WebRTCConfig) => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const peerConnection = useSelector(selectPeerConnection);
  const iceCandidates = useSelector(selectIceCandidates);
  const connectionTimeoutRef = useRef<NodeJS.Timeout>();

  const initializePeerConnection = useCallback(() => {
    try {
      if (peerConnection) {
        peerConnection.close();
      }

      const newPeerConnection = new RTCPeerConnection({
        iceServers: config?.iceServers || [
          { urls: 'stun:stun.l.google.com:19302' }
        ],
      });

      // Connection state monitoring
      newPeerConnection.onconnectionstatechange = () => {
        dispatch(setConnectionState(newPeerConnection.connectionState));
        
        // Reset timeout on state change
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }

        // Set new timeout for failed connections
        if (newPeerConnection.connectionState === 'connecting') {
          connectionTimeoutRef.current = setTimeout(() => {
            if (newPeerConnection.connectionState === 'connecting') {
              console.warn('Connection attempt timed out');
              newPeerConnection.close();
            }
          }, 30000); // 30 second timeout
        }
      };

      newPeerConnection.oniceconnectionstatechange = () => {
        dispatch(setIceConnectionState(newPeerConnection.iceConnectionState));
      };

      newPeerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          const room = config?.room;
          const candidate = event.candidate;
          socket.emit('candidate', { room, candidate } );
        }
      };

      // Handle connection failures
      newPeerConnection.onicecandidateerror = (event: RTCPeerConnectionIceErrorEvent) => {
        console.error('ICE candidate error:', event);
      };

      dispatch(setPeerConnection(newPeerConnection));
      return newPeerConnection;
    } catch (error) {
      throw new WebRTCError('Failed to initialize peer connection', error as Error);
    }
  }, [peerConnection, config?.iceServers, config?.room, dispatch, socket]);

  const handleRemoteDescription = useCallback(async (description: RTCSessionDescription) => {
    if (!peerConnection) {
      throw new WebRTCError('No peer connection available');
    }

    try {
      await peerConnection.setRemoteDescription(description);
      dispatch(setRemoteDescription(description));
      
      // Add any queued ICE candidates
      for (const candidate of iceCandidates) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.warn('Failed to add ICE candidate:', error);
          // Continue with remaining candidates even if one fails
        }
      }
      dispatch(clearIceCandidates());
    } catch (error) {
      throw new WebRTCError('Failed to set remote description', error as Error);
    }
  }, [peerConnection, iceCandidates, dispatch]);

  const addTrack = useCallback((track: MediaStreamTrack, stream: MediaStream) => {
    if (!peerConnection) {
      throw new WebRTCError('No peer connection available');
    }

    try {
      return peerConnection.addTrack(track, stream);
    } catch (error) {
      throw new WebRTCError('Failed to add media track', error as Error);
    }
  }, [peerConnection]);

  const createOffer = useCallback(async (options?: RTCOfferOptions) => {
    if (!peerConnection) {
      throw new WebRTCError('No peer connection available');
    }

    try {
      const offer = await peerConnection.createOffer(options);
      await peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      throw new WebRTCError('Failed to create offer', error as Error);
    }
  }, [peerConnection]);

  const createAnswer = useCallback(async (options?: RTCAnswerOptions) => {
    if (!peerConnection) {
      throw new WebRTCError('No peer connection available');
    }

    try {
      const answer = await peerConnection.createAnswer(options);
      await peerConnection.setLocalDescription(answer);
      return answer;
    } catch (error) {
      throw new WebRTCError('Failed to create answer', error as Error);
    }
  }, [peerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      if (peerConnection) {
        peerConnection.close();
      }
    };
  }, [peerConnection]);

  return {
    initializePeerConnection,
    handleRemoteDescription,
    addTrack,
    createOffer,
    createAnswer,
    peerConnection,
  };
};