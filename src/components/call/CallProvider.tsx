'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { WebRTCManager, createWebRTCManager } from '@/lib/webrtc';

interface CallState {
  isInCall: boolean;
  callId: string | null;
  roomId: string | null;
  callType: 'audio' | 'video' | null;
  chatType: 'DMs' | 'Groups' | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
}

interface CallContextType {
  callState: CallState;
  initiateCall: (callData: {
    roomId: string;
    targetUserId?: string;
    callType: 'audio' | 'video';
    chatType: 'DMs' | 'Groups';
  }) => Promise<void>;
  answerCall: (callId: string, accepted: boolean) => Promise<void>;
  endCall: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

interface CallProviderProps {
  children: ReactNode;
  socket: Socket;
}

export function CallProvider({ children, socket }: CallProviderProps) {
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    callId: null,
    roomId: null,
    callType: null,
    chatType: null,
    isConnecting: false,
    isConnected: false,
    error: null
  });

  const [webrtcManager, setWebRTCManager] = useState<WebRTCManager | null>(null);

  const updateCallState = useCallback((updates: Partial<CallState>) => {
    setCallState(prev => ({ ...prev, ...updates }));
  }, []);

  const setError = useCallback((error: string | null) => {
    updateCallState({ error });
  }, [updateCallState]);

  const clearError = useCallback(() => {
    updateCallState({ error: null });
  }, [updateCallState]);

  const getCallerId = (): string => {
    const auth: unknown = (socket as any).auth;
    if (typeof auth === 'function') return 'unknown';
    return (auth as Record<string, any>)?.userId || 'unknown';
  };

  const initiateCall = useCallback(async (callData: {
    roomId: string;
    targetUserId?: string;
    callType: 'audio' | 'video';
    chatType: 'DMs' | 'Groups';
  }) => {
    try {
      const manager = createWebRTCManager(socket);
      setWebRTCManager(manager);

      updateCallState({
        isInCall: true,
        roomId: callData.roomId,
        callType: callData.callType,
        chatType: callData.chatType,
        isConnecting: true,
        isConnected: false,
        error: null
      });

      manager.setOnCallStateChange((state) => {
        switch (state) {
          case 'connected':
            updateCallState({ isConnecting: false, isConnected: true });
            break;
          case 'ended':
          case 'declined':
            updateCallState({
              isInCall: false,
              callId: null,
              roomId: null,
              callType: null,
              chatType: null,
              isConnecting: false,
              isConnected: false
            });
            break;
        }
      });

      const callId = await manager.initiateCall({
        callId: '',
        roomId: callData.roomId,
        callerId: getCallerId(),
        targetUserId: callData.targetUserId,
        callType: callData.callType,
        chatType: callData.chatType
      });

      updateCallState({ callId });

      await manager.setupPeerConnection(callData.callType);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate call';
      setError(errorMessage);
      updateCallState({
        isInCall: false,
        callId: null,
        roomId: null,
        callType: null,
        chatType: null,
        isConnecting: false,
        isConnected: false
      });
    }
  }, [socket, updateCallState, setError]);

  const answerCall = useCallback(async (callId: string, accepted: boolean) => {
    if (!webrtcManager) return;

    try {
      if (accepted) {
        if (!webrtcManager) {
          const manager = createWebRTCManager(socket);
          setWebRTCManager(manager);
        }

        updateCallState({
          isInCall: true,
          callId,
          isConnecting: true,
          isConnected: false,
          error: null
        });

        await webrtcManager.setupPeerConnection(callState.callType || 'audio');
      }

      await webrtcManager.answerCall(callId, accepted);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to answer call';
      setError(errorMessage);
      updateCallState({
        isInCall: false,
        callId: null,
        roomId: null,
        callType: null,
        chatType: null,
        isConnecting: false,
        isConnected: false
      });
    }
  }, [webrtcManager, socket, callState.callType, updateCallState, setError]);

  const endCall = useCallback(async () => {
    if (webrtcManager) {
      try {
        await webrtcManager.endCall();
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }

    setWebRTCManager(null);
    updateCallState({
      isInCall: false,
      callId: null,
      roomId: null,
      callType: null,
      chatType: null,
      isConnecting: false,
      isConnected: false
    });
  }, [webrtcManager, updateCallState]);

  const value: CallContextType = {
    callState,
    initiateCall,
    answerCall,
    endCall,
    setError,
    clearError
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}
