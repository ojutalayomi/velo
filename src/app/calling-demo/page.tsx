'use client';

import React, { useState, useEffect } from 'react';
import { 
  CallButton, 
  CallInterface, 
  IncomingCall, 
  CallStatus,
  useCallManager 
} from '@/components/call';
import { useSocket } from '@/app/providers/SocketProvider';

export default function CallingDemo() {
  const socket = useSocket();
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState('');
  const [roomId, setRoomId] = useState('demo-room-1');
  const [chatType, setChatType] = useState<'DMs' | 'Groups'>('DMs');
  const [targetUserId, setTargetUserId] = useState('user-2');

  const callHooks = useCallManager(socket!);
  const callState = callHooks?.callState || {
    isInCall: false,
    callId: null,
    roomId: null,
    callType: null,
    chatType: null,
    isConnecting: false,
    isConnected: false,
    error: null
  };

  useEffect(() => {
    socket?.on('connect', () => {
      setIsConnected(true);
    });

    socket?.on('disconnect', () => {
      setIsConnected(false);
    });
  }, [socket]);

  const connectSocket = () => {
    if (socket && userId) {
      socket.auth = { userId };
      socket.connect();
    }
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
    }
  };

  const handleIncomingCall = (callData: any) => {
    // placeholder
  };

  const handleCallEnd = () => {
    callHooks?.endCall();
  };

  if (!socket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-auto h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Velo Calling Demo</h1>
            <div className="flex items-center space-x-4">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Connection Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Connection Setup</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter your user ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room ID
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter room ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chat Type
                </label>
                <select
                  value={chatType}
                  onChange={(e) => setChatType(e.target.value as 'DMs' | 'Groups')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DMs">Direct Messages</option>
                  <option value="Groups">Group Chat</option>
                </select>
              </div>

              {chatType === 'DMs' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target User ID
                  </label>
                  <input
                    type="text"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder="Enter target user ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={connectSocket}
                  disabled={!userId || isConnected}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Connect
                </button>
                <button
                  onClick={disconnectSocket}
                  disabled={!isConnected}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>

          {/* Call Controls Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Call Controls</h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CallButton
                  roomId={roomId}
                  targetUserId={chatType === 'DMs' ? targetUserId : undefined}
                  chatType={chatType}
                  onInitiateCall={callHooks?.initiateCall || (async () => {})}
                  disabled={!isConnected || callState.isInCall}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">
                  {callState.isInCall ? 'In Call' : 'Start Call'}
                </span>
              </div>

              {callState.isInCall && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Call ID:</strong> {callState.callId || 'Connecting...'}
                    </p>
                    <p className="text-sm text-blue-800">
                      <strong>Type:</strong> {callState.callType || 'Unknown'}
                    </p>
                    <p className="text-sm text-blue-800">
                      <strong>Status:</strong> {callState.isConnecting ? 'Connecting...' : 'Connected'}
                    </p>
                  </div>

                  <button
                    onClick={handleCallEnd}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    End Call
                  </button>
                </div>
              )}

              <div className="text-sm text-gray-600">
                <p><strong>Note:</strong> Open this demo in multiple browser tabs to test calling between users.</p>
                <p>Make sure to use different User IDs for each tab.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Call Status */}
        {callState.isInCall && (
          <div className="mt-8">
            <CallStatus
              state={callState.isConnecting ? 'connecting' : callState.isConnected ? 'connected' : 'idle'}
              callType={callState.callType || 'audio'}
              roomId={roomId}
            />
          </div>
        )}

        {/* Call Interface Overlay */}
        {callState.isInCall && (
          <div className="fixed inset-0 z-50 bg-black/90">
            <CallInterface
              socket={socket}
              roomId={roomId}
              targetUserId={chatType === 'DMs' ? targetUserId : undefined}
              chatType={chatType}
              onCallEnd={handleCallEnd}
            />
          </div>
        )}

        {/* Incoming Call Handler */}
        <IncomingCall
          socket={socket}
          onAccept={handleIncomingCall}
          onDecline={() => {
            // placeholder
          }}
        />
      </div>
    </div>
  );
}
