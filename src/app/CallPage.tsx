'use client'
import React, { useEffect, useRef, useState } from 'react';
import { Camera, Mic, MicOff, Video, VideoOff, Phone, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CallConfirmation from './CallPage2';

interface DeviceInfo {
  deviceId: string;
  label: string;
}

export interface Devices {
  videoDevices: DeviceInfo[];
  audioInputDevices: DeviceInfo[];
  audioOutputDevices: DeviceInfo[];
}

export interface SelectedDevices {
  videoDeviceId: string;
  audioInputDeviceId: string;
  audioOutputDeviceId: string;
}

export default function VideoChat() {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmed, setConfirmed] = useState(true);
  const [name, setName] = useState('');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [error, setError] = useState('');
  const [devices, setDevices] = useState<Devices>({
    videoDevices: [],
    audioInputDevices: [],
    audioOutputDevices: [],
  });
  const [selectedDevices, setSelectedDevices] = useState<SelectedDevices>({
    videoDeviceId: '',
    audioInputDeviceId: '',
    audioOutputDeviceId: '',
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadDevices();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const loadDevices = async () => {
    try {
      // Request permissions first to get labeled device information
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
      const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');

      setDevices({
        videoDevices: videoDevices.map(d => ({ deviceId: d.deviceId, label: d.label })),
        audioInputDevices: audioInputDevices.map(d => ({ deviceId: d.deviceId, label: d.label })),
        audioOutputDevices: audioOutputDevices.map(d => ({ deviceId: d.deviceId, label: d.label })),
      });

      // Set default devices
      setSelectedDevices({
        videoDeviceId: videoDevices[0]?.deviceId || '',
        audioInputDeviceId: audioInputDevices[0]?.deviceId || '',
        audioOutputDeviceId: audioOutputDevices[0]?.deviceId || '',
      });

      // Start camera with default device
      if (videoDevices[0]?.deviceId) {
        await startCamera(videoDevices[0].deviceId, audioInputDevices[0]?.deviceId || '');
      }
    } catch (err) {
      console.error('Error loading devices:', err);
      setError('Unable to access media devices. Please check permissions.');
    }
  };

  const startCamera = async (videoDeviceId: string, audioDeviceId: string) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined },
        audio: { deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined },
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

  const changeDevice = async (deviceId: string, type: 'video' | 'audioInput' | 'audioOutput') => {
    try {
      switch (type) {
        case 'video':
          setSelectedDevices(prev => ({ ...prev, videoDeviceId: deviceId }));
          await startCamera(deviceId, selectedDevices.audioInputDeviceId);
          break;
        case 'audioInput':
          setSelectedDevices(prev => ({ ...prev, audioInputDeviceId: deviceId }));
          await startCamera(selectedDevices.videoDeviceId, deviceId);
          break;
        case 'audioOutput':
          setSelectedDevices(prev => ({ ...prev, audioOutputDeviceId: deviceId }));
          if (videoRef.current && 'setSinkId' in videoRef.current) {
            // TypeScript doesn't recognize setSinkId by default
            await (videoRef.current as any).setSinkId(deviceId);
          }
          break;
      }
    } catch (err) {
      console.error('Error changing device:', err);
      setError('Failed to switch device. Please try again.');
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

  const handleJoinCall = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setIsLoading(true);
    // Implement call joining logic here
    setTimeout(() => {
      setIsLoading(false);
      setConfirmed(false);
      }, 1000);
  };

  if(isConfirmed){
    return <CallConfirmation
    name={name}
    error={error}
    isLoading={isLoading}
    isVideoOn={isVideoOn}
    isMicOn={isMicOn}
    devices={devices}
    selectedDevices={selectedDevices}
    streamRef={streamRef}
    videoRef={videoRef}
    setSelectedDevices={setSelectedDevices}
    setName={setName} 
    loadDevices={loadDevices}
    startCamera={startCamera}
    toggleVideo={toggleVideo}
    toggleMic={toggleMic}
    handleJoinCall={handleJoinCall}/>
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 p-4 transition-colors duration-200">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Main video grid */}
      <div className="flex-1 grid tablets1:grid-cols-2 gap-4 mb-4">
        {/* Local video */}
        <Card 
        className="mobile:absolute tablets1:relative bg-gray-900 dark:bg-gray-800 rounded-lg overflow-hidden border-0 mobile:bottom-0 mobile:right-0 mobile:m-3 mobile:z-[1] mobile:h-[30dvh] mobile:aspect-[9/16]"
        >
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

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full w-12 h-12 flex items-center justify-center dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white transition-colors duration-200"
            >
              <Settings size={24} />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Device Settings</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Camera Select */}
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="col-span-1">Camera</span>
                <div className="col-span-3">
                  <Select 
                    value={selectedDevices.videoDeviceId}
                    onValueChange={(value) => changeDevice(value, 'video')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.videoDevices.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Microphone Select */}
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="col-span-1">Microphone</span>
                <div className="col-span-3">
                  <Select 
                    value={selectedDevices.audioInputDeviceId}
                    onValueChange={(value) => changeDevice(value, 'audioInput')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select microphone" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.audioInputDevices.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Speaker Select */}
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="col-span-1">Speaker</span>
                <div className="col-span-3">
                  <Select 
                    value={selectedDevices.audioOutputDeviceId}
                    onValueChange={(value) => changeDevice(value, 'audioOutput')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select speaker" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.audioOutputDevices.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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