'use client'
import React, { useEffect, useRef } from 'react';
import { Camera, Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function VideoChat() {
  const [isMicOn, setIsMicOn] = React.useState(true);
  const [isVideoOn, setIsVideoOn] = React.useState(true);
  const [error, setError] = React.useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      // Cleanup: stop all tracks when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError('');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please make sure you have granted camera permissions.');
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
      }
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(!isMicOn);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 p-4 transition-colors duration-200">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Main video grid */}
      <div className="flex-1 grid grid-cols-2 gap-4 mb-4">
        {/* Local video */}
        <Card className="relative bg-gray-900 dark:bg-gray-800 rounded-lg overflow-hidden border-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!isVideoOn ? 'hidden' : ''}`}
          />
          {!isVideoOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
              <VideoOff size={48} />
            </div>
          )}
          <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 dark:bg-black/70 px-2 py-1 rounded">
            You
          </div>
        </Card>
        
        {/* Remote video placeholder */}
        <Card className="relative bg-gray-900 dark:bg-gray-800 rounded-lg overflow-hidden border-0">
          <div className="absolute inset-0 flex items-center justify-center text-white">
            Waiting for remote user...
          </div>
          <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 dark:bg-black/70 px-2 py-1 rounded">
            Remote User
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-900/30 transition-colors duration-200">
        <Button
          variant={isMicOn ? "default" : "destructive"}
          size="lg"
          onClick={toggleMic}
          className="rounded-full w-12 h-12 flex items-center justify-center dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white transition-colors duration-200"
        >
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </Button>

        <Button
          variant={isVideoOn ? "default" : "destructive"}
          size="lg"
          onClick={toggleVideo}
          className="rounded-full w-12 h-12 flex items-center justify-center dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white transition-colors duration-200"
        >
          {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
        </Button>

        <Button
          variant="destructive"
          size="lg"
          className="rounded-full w-12 h-12 flex items-center justify-center dark:hover:bg-red-600 transition-colors duration-200"
        >
          <Phone size={24} />
        </Button>
      </div>
    </div>
  );
}