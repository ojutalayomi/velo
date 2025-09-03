import React from 'react';
import { Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Devices = {
  videoDevices: MediaDeviceInfo[],
  audioInputDevices: MediaDeviceInfo[],
}

type SelectedDevices = {
  videoDeviceId: string,
  audioInputDeviceId: string,
}

interface CallConfirmationProps {
    name: string,
    error: string,
    isLoading: boolean,
    isVideoOn: boolean,
    isMicOn: boolean,
    devices: Devices,
    selectedDevices: SelectedDevices,
    streamRef: React.MutableRefObject<MediaStream | null>,
    videoRef: React.MutableRefObject<HTMLVideoElement | null>,
    setSelectedDevices: React.Dispatch<React.SetStateAction<SelectedDevices>>,
    setName: React.Dispatch<React.SetStateAction<string>>,
    loadDevices: () => void,
    startCamera: (videoDeviceId: string, audioDeviceId: string) => void,
    toggleVideo: () => void,
    toggleMic: () => void,
    handleJoinCall: () => void,
}

export default function CallConfirmation(
{ 
    name, error, isLoading, isVideoOn, isMicOn, devices, selectedDevices, streamRef, videoRef, setName,
    setSelectedDevices, loadDevices, startCamera, toggleVideo, toggleMic, handleJoinCall
}: CallConfirmationProps ) {
   


  return (
    <div className="fixed inset-0 z-10 min-h-screen h-[100dvh] overflow-auto bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-200">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="p-6 dark:bg-gray-800">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            Join Video Call
          </h1>
          
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Your Name
              </label>
              <Input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Video Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Video Preview
              </label>
              <Card className="relative aspect-video bg-gray-900 dark:bg-gray-800 rounded-lg overflow-hidden">
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
              </Card>
            </div>

            {/* Device Selection */}
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Camera
                </label>
                <Select
                  value={selectedDevices.videoDeviceId}
                  onValueChange={(value) => {
                    setSelectedDevices(prev => ({ ...prev, videoDeviceId: value }));
                    startCamera(value, selectedDevices.audioInputDeviceId);
                  }}
                >
                  <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Microphone
                </label>
                <Select
                  value={selectedDevices.audioInputDeviceId}
                  onValueChange={(value) => {
                    setSelectedDevices(prev => ({ ...prev, audioInputDeviceId: value }));
                    startCamera(selectedDevices.videoDeviceId, value);
                  }}
                >
                  <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
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

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant={isMicOn ? "outline" : "destructive"}
                  size="lg"
                  onClick={toggleMic}
                  className="rounded-full w-12 h-12 flex items-center justify-center"
                >
                  {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                </Button>
                <Button
                  variant={isVideoOn ? "outline" : "destructive"}
                  size="lg"
                  onClick={toggleVideo}
                  className="rounded-full w-12 h-12 flex items-center justify-center"
                >
                  {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
                </Button>
              </div>

              <Button
                onClick={handleJoinCall}
                disabled={isLoading || !name.trim()}
                className="bg-green-600 hover:bg-green-700 text-white px-8"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Joining...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone size={20} />
                    Join Call
                  </div>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}