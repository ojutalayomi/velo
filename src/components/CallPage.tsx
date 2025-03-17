'use client'
import React, { useEffect, useRef, useState, Suspense, useCallback } from 'react';
import { useWebRTC, WebRTCError } from '@/hooks/useWebRTC';
import { selectPeerConnection } from '@/redux/rtcSlice';
import { Camera, Mic, MicOff, Video, VideoOff, Phone, Settings, PieChartIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useSocket } from '@/app/providers/SocketProvider';
import { CopyIcon } from '@radix-ui/react-icons';
import { Label } from '@radix-ui/react-select';
import { useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useSignaling } from '@/hooks/useSignaling';
import { useHangup } from '@/hooks/useHangup';

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

const PreVideoChat: React.FC = () => {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id');
  const acceptCall = searchParams?.get('accept');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardRef2 = useRef<HTMLDivElement>(null);
  const socket = useSocket();
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const { 
    initializePeerConnection,
    handleRemoteDescription, 
    addTrack, 
    createOffer, 
    createAnswer,
    pc, 
  } = useWebRTC({
    room: id as string,
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  useSignaling({
    peerConnection: pc,
    room: id as string,
    handleRemoteDescription,
  });
  const { hangUp } = useHangup({
    peerConnection: pc,
    socket,
    room: id as string,
    videoRefs: {
      localVideo: videoRef as React.RefObject<HTMLVideoElement>,
      remoteVideo: remoteVideoRef as React.RefObject<HTMLVideoElement>,
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const mediaConfirmedRef = useRef(false);
  const [name, setName] = useState('');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isVideoOn1, setIsVideoOn1] = useState(true);
  const [error, setError] = useState('');
  const [room, setRoom] = useState('');
  const [isJoined, setIsJoined] = useState(false);
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

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDraggableLocal, setIsDraggableLocal] = useState<boolean>(true);

  useEffect(() => {
    const startCall = async () => {
      try {
        const pc = initializePeerConnection();  // Initialize peer connection
        
        if (!pc) {
          throw new WebRTCError('No peer connection available to add tracks');
        }

        // Add media tracks to the peer connection
        if (!streamRef.current) {
          throw new Error('No local stream available');
        }
  
        console.log('Adding tracks:', streamRef.current.getTracks());
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) =>
          addTrack(track, streamRef.current as MediaStream)
        );
        // If not accepting a call, create and send an offer
        if (acceptCall === "false") {
          const offer = await createOffer();
          socket?.emit('offer', offer);  // Send the offer via socket
          socket?.emit('callOffer', offer);
        } else {
          socket?.emit('user-joined', 'offer');
        }
  
        // Handle receiving remote tracks
        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            console.log('Received remote track:', event.track);
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };
      } catch (err) {
        console.error('Error joining call:', err);
        setError((err as Error).message);  // Set error state
        setIsLoading(false);  // Stop the loading state if there was an error
      }
    };
  
    // Start the call asynchronously
    console.log('Media confirmed ref:', mediaConfirmedRef.current);
    if (socket) {
      startCall();
    }
  
    return () => {
      // Cleanup when component is unmounted or dependencies change
      if (pc) {
        pc.close();
      }
    };
  }, [acceptCall, addTrack, createOffer, initializePeerConnection, mediaConfirmedRef, pc, socket]);
  

  const handleMove = (clientX: number, clientY: number): void => {
    if (isDragging && cardRef.current) {
      const cardRect = cardRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate new position
      let newX = position.x + (clientX - dragStart.x);
      let newY = position.y + (clientY - dragStart.y);

      // Apply boundaries
      newX = Math.max(0, Math.min(viewportWidth - cardRect.width, newX));
      newY = Math.max(0, Math.min(viewportHeight - cardRect.height, newY));

      setPosition({ x: newX, y: newY });
      setDragStart({ x: clientX, y: clientY });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // e.preventDefault();
    handleMove(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    // e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleEnd = (): void => {
    setIsDragging(false);
  };

  const joinRoom = () => {
    if (room.trim()) {
      if (socket) {
        setRoom(id as string);
        socket.emit('join-room', `call:${id}`); // Emit a join-room event to the server
        setIsJoined(true);
      } else {
        setError('Connection problem. Please try again.');
      }
    }
  };

  const loadDevices = useCallback(async () => {
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
  }, []);

  const func = useCallback(async () => {
    await loadDevices();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [loadDevices])

  useEffect(() => {
    func();
  }, [func]);

  useEffect(() => {
    if(streamRef.current) {
      mediaConfirmedRef.current = true;
    }
  }, [streamRef])

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
      mediaConfirmedRef.current = true;
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

  const movable = "tablets1:relative bg-gray-900 dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden border-0 mobile:z-10 mobile:h-[30dvh] mobile:aspect-[9/16]";
  const notMovable = "mobile:absolute mobile:inset-0 mobile:rounded-none relative bg-gray-900 dark:bg-gray-800 rounded-lg overflow-hidden border-0";

  const classChange = () => {
    if(cardRef.current && cardRef2.current){
      setIsDraggableLocal(!isDraggableLocal);
      if(cardRef.current?.className === movable){
        cardRef.current.className = notMovable;
        cardRef2.current.className = movable;
      } else {
        cardRef.current.className = movable;
        cardRef2.current.className = notMovable;
      }
    }
  }

  const Card_ = React.forwardRef<HTMLDivElement, 
    {children: React.ReactNode, type?: "user" | "remote"}
  >(({children, type}, ref) => (
      <Card 
      ref={ref} 
      className={isDraggableLocal ? movable : notMovable}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        touchAction: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleEnd}
      onDoubleClick={classChange}
      >
        {children}
      </Card>
  ))
  Card_.displayName = ''


  return (
    <div className="fixed inset-0 z-10 flex flex-col h-screen bg-gray-100 dark:bg-gray-900 p-4 transition-colors duration-200">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Main video grid */}
      <div className="flex-1 grid tablets1:grid-cols-2 gap-4 mb-4">
        {/* Local video */}
        <Card_
        ref={cardRef}
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
        </Card_>
        
        {/* Remote video placeholder */}
        <Card className={notMovable} ref={cardRef2}>
          {remoteVideoRef.current ?
          <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!isVideoOn1 ? 'hidden' : ''}`}
          />
          {!isVideoOn1 && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
              <VideoOff size={48} />
            </div>
          )}
          </>:
          <div className="absolute inset-0 flex items-center justify-center text-white">
            Waiting for remote user...
          </div>}
          <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 dark:bg-black/70 px-2 py-1 rounded">
            {remoteVideoRef.current ? 'handleEnd' : 'Remote User'}
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div className="mobile:!bg-transparent mobile:shadow-none flex justify-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-900/30 transition-colors duration-200 z-[1]">
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
          <DialogContent className="round-lg sm:max-w-[425px]">
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

        <Dialog>
          <DialogTrigger asChild>
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-12 h-12 flex items-center justify-center dark:hover:bg-red-600 transition-colors duration-200"
          >
            <Phone size={24} />
          </Button>
          </DialogTrigger>
          <DialogContent className="round-lg sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                Are you sure you want to end this call?
                Click outside the modal to close it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
              onClick={hangUp}
              className="rounded-lg h-12 flex items-center justify-center dark:hover:bg-red-600 transition-colors duration-200"
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

function VideoChat() {
 
  return (
    <Suspense>
      <PreVideoChat />
    </Suspense>
    );
}

export default VideoChat;