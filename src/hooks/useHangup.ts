import { useCallback, useEffect } from 'react';
import { 
  setPeerConnection, 
  resetConnection,
  setError,
} from '@/redux/rtcSlice';
import { Socket } from 'socket.io-client';
import { useAppDispatch } from '@/redux/hooks';

interface VideoRefs {
  localVideo: React.RefObject<HTMLVideoElement>;
  remoteVideo: React.RefObject<HTMLVideoElement>;
}

interface UseHangupProps {
  peerConnection: RTCPeerConnection | null;
  socket: Socket | null;
  room: string;
  videoRefs: VideoRefs;
  onHangup?: () => void;
}

export const useHangup = ({
  peerConnection,
  socket,
  room,
  videoRefs,
  onHangup,
}: UseHangupProps) => {
  const dispatch = useAppDispatch();

  const stopAllTracks = useCallback((stream: MediaStream | null) => {
    if (!stream) return;
    stream.getTracks().forEach(track => {
      track.stop();
      stream.removeTrack(track);
    });
  }, []);

  const cleanupVideoElement = useCallback((videoElement: HTMLVideoElement | null) => {
    if (!videoElement) return;
    
    // Stop all tracks from the current stream
    const currentStream = videoElement.srcObject as MediaStream;
    stopAllTracks(currentStream);
    
    // Clear the srcObject
    videoElement.srcObject = null;
    
    // Remove any event listeners
    videoElement.onloadedmetadata = null;
    videoElement.onplay = null;
    videoElement.onpause = null;
  }, [stopAllTracks]);

  const hangUp = useCallback(async () => {
    try {
      if (peerConnection) {
        // Close all data channels
        peerConnection.close();

        // Close all transceivers
        const transceivers = peerConnection.getTransceivers();
        transceivers.forEach(transceiver => {
          if (transceiver.stop) {
            transceiver.stop();
          }
        });

        // Remove all tracks
        const senders = peerConnection.getSenders();
        senders.forEach(sender => {
          if (sender.track) {
            sender.track.stop();
          }
          try {
            peerConnection.removeTrack(sender);
          } catch (err) {
            console.warn('Error removing track:', err);
          }
        });

        // Close the peer connection
        peerConnection.close();
        
        // Cleanup video elements
        cleanupVideoElement(videoRefs.localVideo.current);
        cleanupVideoElement(videoRefs.remoteVideo.current);

        // Notify the server
        if (socket) {
          socket.emit('hangup', { room });
        }

        // Reset Redux state
        dispatch(resetConnection());
        dispatch(setPeerConnection(null));

        // Call the optional callback
        onHangup?.();
      }
    } catch (error) {
      console.error('Error during hangup:', error);
      dispatch(setError({
        message: 'Error during connection cleanup',
        timestamp: Date.now(),
        code: 'HANGUP_ERROR'
      }));
    }
  }, [
    peerConnection,
    socket,
    room,
    videoRefs,
    cleanupVideoElement,
    dispatch,
    onHangup
  ]);

  // Handle incoming hangup signal
  useEffect(() => {
    if (!socket) return;

    const handleRemoteHangup = () => {
      hangUp();
    };

    socket.on('remote-hangup', handleRemoteHangup);

    return () => {
      socket.off('remote-hangup');
    };
  }, [socket, hangUp]);

  return {
    hangUp,
  };
};