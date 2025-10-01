import { useEffect, useCallback } from "react";
import { setError, setIsInitiator, setLocalDescription, addIceCandidate } from "@/redux/rtcSlice";
import { useSocket } from "@/app/providers/SocketProvider";
import { useAppDispatch } from "@/redux/hooks";

interface UseSignalingProps {
  peerConnection: RTCPeerConnection | null;
  room: string;
  handleRemoteDescription: (description: RTCSessionDescription) => Promise<void>;
}

export const useSignaling = ({
  peerConnection,
  room,
  handleRemoteDescription,
}: UseSignalingProps) => {
  const socket = useSocket();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!room) return;
  }, [room]);

  const handleSignalingError = useCallback(
    (error: Error, context: string) => {
      console.error(`Error in ${context}:`, error);
      dispatch(
        setError({
          message: `Failed to ${context}: ${error.message}`,
          timestamp: Date.now(),
          code: error.name,
        })
      );
    },
    [dispatch]
  );

  const handleOffer = useCallback(
    async (data: { offer: RTCSessionDescription; room: string }) => {
      const { offer } = data;
      if (!peerConnection || !socket) return;

      try {
        dispatch(setIsInitiator(false));
        await handleRemoteDescription(offer);

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        dispatch(setLocalDescription(answer));

        socket.emit("answer", { room, answer });
      } catch (error) {
        handleSignalingError(error as Error, "handle offer");
      }
    },
    [peerConnection, socket, room, handleRemoteDescription, dispatch, handleSignalingError]
  );

  const handleUserJoined = useCallback(async () => {
    // No-op: initiator is handled explicitly by caller side
  }, []);

  const handleAnswer = useCallback(
    async (answer: RTCSessionDescription) => {
      if (!peerConnection) return;

      try {
        await handleRemoteDescription(answer);
      } catch (error) {
        handleSignalingError(error as Error, "handle answer");
      }
    },
    [peerConnection, handleRemoteDescription, handleSignalingError]
  );

  const handleCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      if (!peerConnection) return;

      try {
        if (peerConnection.remoteDescription) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          // Queue the candidate if remote description isn't set
          dispatch(addIceCandidate(candidate));
        }
      } catch (error) {
        handleSignalingError(error as Error, "add ICE candidate");
      }
    },
    [peerConnection, dispatch, handleSignalingError]
  );

  useEffect(() => {
    if (!socket) return;

    // Set up event listeners
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("candidate", handleCandidate);
    socket.on("user-joined", handleUserJoined);

    // Error handling for socket disconnection
    socket.on("disconnect", () => {
      dispatch(
        setError({
          message: "Connection to signaling server lost",
          timestamp: Date.now(),
          code: "SIGNALING_DISCONNECTED",
        })
      );
    });

    // Error handling for socket errors
    socket.on("error", (errorMessage: string) => {
      dispatch(
        setError({
          message: `Signaling server error: ${errorMessage}`,
          timestamp: Date.now(),
          code: "SIGNALING_ERROR",
        })
      );
    });

    // Cleanup
    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("candidate");
      socket.off("user-joined");
      socket.off("disconnect");
      socket.off("error");
    };
  }, [socket, handleOffer, handleAnswer, handleCandidate, handleUserJoined, dispatch]);
};
