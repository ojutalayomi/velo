import React, { useState, useRef, useEffect } from "react";
import Link from 'next/link';
import { VideoProps } from "../components/ImgVidProps";
import { VolumeX, Volume2 } from "lucide-react";

const VideoDiv: React.FC<VideoProps> = ({ media, link = '', host }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);  
  const [replyText, setReplyText] = useState('');
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hostname: string = 'https://s3.amazonaws.com/post-s/';

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
    }
    return () => {
      if (video) {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect (() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);
  
  useEffect (() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if(formatTime(currentTime) === formatTime(duration)){
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [currentTime, duration])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (isMuted) {
      setVolume(volume === 0 ? 1 : volume);
    }
  };

  return (
    <>
    <div className="h-full relative">
      <Link href={link} className={link !== '' ? '' : 'contents'} onClick={(e) => link === '' && e.preventDefault()}>
        <video
          ref={videoRef}
          className="cursor-pointer h-full w-full"
          onClick={togglePlay}
        >
          <source src={host ? hostname + media : media} />
        </video>
      </Link>
    </div>
    {/* Controls */}
    <div className="absolute bottom-0 p-2 w-full" style={{ bottom: 0,}}>
      <div className="flex items-center mb-2" style={{ gap: '10px',}}>
        <button onClick={togglePlay} className="text-white">
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <div className="flex-grow bg-gray-700 h-[0.25rem] rounded-full" style={{ backgroundColor: '#374151',height: '0.25rem',}}>
          <div
            className="bg-white h-full rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        {/* Volume control */}
        <div className="flex items-center" style={{ gap: '10px',}}>
          <button onClick={toggleMute}>
            {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            style={{ backgroundColor: '#374151',height: '0.25rem',}}
            className={`w-24 h-1 bg-gray-700 rounded-lg ${isMuted && 'hidden'} tablets1:hidden appearance-none cursor-pointer`}
          />
        </div>
        <span className="ml-2 text-sm text-white">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
    </>
  );
};

export default VideoDiv;
