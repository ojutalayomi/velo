'use client';

import React, { useState, useEffect } from 'react';
import { CallProvider } from '@/components/call/CallProvider';
import CallInterface from '@/components/call/CallInterface';
import CallButton from '@/components/call/CallButton';
import IncomingCall from '@/components/call/IncomingCall';
import { useSocket } from '@/app/providers/SocketProvider';

// Mock user data for demonstration
const mockUsers = [
  { id: '1', name: 'John Doe', avatar: 'JD', online: true },
  { id: '2', name: 'Jane Smith', avatar: 'JS', online: true },
  { id: '3', name: 'Mike Johnson', avatar: 'MJ', online: false },
  { id: '4', name: 'Sarah Wilson', avatar: 'SW', online: true },
];

export default function CallPage() {
  const socket = useSocket();
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    callerName: string;
    callType: 'audio' | 'video';
  } | null>(null);

  // Simulate incoming call for demonstration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIncomingCall({
        callId: 'demo-call-1',
        callerName: 'John Doe',
        callType: 'video',
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleAnswerCall = (callData: any) => {
    console.log('Answering call:', callData);
    setIncomingCall(null);
    // In a real app, this would connect the call
  };

  const handleDeclineCall = () => {
    console.log('Declining call');
    setIncomingCall(null);
  };

  return (
    <CallProvider socket={socket!}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Video Calling</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">Demo Mode</span>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - User List */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Available Users</h2>
              
              <div className="space-y-4">
                {mockUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.avatar}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          user.online ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-500">
                          {user.online ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>
                    
                    <CallButton roomId={user.id} targetUserId={user.id} chatType={'DMs'} onInitiateCall={() => {}} disabled={false} className="" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Features & Info */}
            <div className="space-y-6">
              {/* Features Card */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Call Features</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900">HD Video</span>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Crystal Audio</span>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Screen Share</span>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Secure</span>
                  </div>
                </div>
              </div>

              {/* Instructions Card */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Use</h2>
                
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-medium">1</span>
                    </div>
                    <p>Click the call button next to any user to initiate a call</p>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-medium">2</span>
                    </div>
                    <p>Choose between audio or video call</p>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-medium">3</span>
                    </div>
                    <p>Use the controls to mute, toggle video, or share screen</p>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-medium">4</span>
                    </div>
                    <p>Click the red button to end the call</p>
                  </div>
                </div>
              </div>

              {/* Status Card */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">WebRTC Support</span>
                    <span className="text-sm font-medium text-green-600">✓ Available</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Camera Access</span>
                    <span className="text-sm font-medium text-green-600">✓ Available</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Microphone Access</span>
                    <span className="text-sm font-medium text-green-600">✓ Available</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Screen Sharing</span>
                    <span className="text-sm font-medium text-green-600">✓ Available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call Interface - Overlay */}
        <CallInterface socket={socket!} roomId={incomingCall?.callId || ''} chatType={'DMs'} onCallEnd={() => {}} />

        {/* Incoming Call Modal */}
        {incomingCall && (
          <IncomingCall
            socket={socket!}
            onAccept={handleAnswerCall}
            onDecline={handleDeclineCall}
          />
        )}
      </div>
    </CallProvider>
  );
}