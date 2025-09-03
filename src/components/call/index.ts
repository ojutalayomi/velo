// Call Components
export { default as CallInterface } from './CallInterface';
export { default as CallControls } from './CallControls';
export { default as CallStatus } from './CallStatus';
export { default as CallButton } from './CallButton';
export { default as IncomingCall } from './IncomingCall';

// Call Context and Provider
export { CallProvider, useCall } from './CallProvider';

// Call Hooks
export { useCallManager } from '@/hooks/useCallManager';

// Call Types
export interface CallData {
  callId: string;
  roomId: string;
  callerId: string;
  callType: 'audio' | 'video';
  chatType: 'DMs' | 'Groups';
}

export interface IncomingCallData {
  callId: string;
  roomId: string;
  callerId: string;
  callType: 'audio' | 'video';
  chatType: 'DMs' | 'Groups';
  callerName?: string;
}
