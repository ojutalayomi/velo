import React, { useState, useRef, useEffect } from "react";
import Link from 'next/link';
import { VideoProps } from "../components/ImgVidProps";
import { VolumeX, Volume2, Play, Pause } from "lucide-react";

const VideoDiv: React.FC<VideoProps> = ({ media, link = '', host }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hostname = 'https://s3.amazonaws.com/post-s/';

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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
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

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * duration;
    }
  };

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
    <div 
      className="relative w-full h-full group flex items-center justify-center"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {link ? (
        <Link href={link} className="# z">
          <video
            ref={videoRef}
            className="w-auto h-auto max-h-[calc(100vh-200px)] object-contain cursor-pointer"
            style={{ maxWidth: '100%' }}
            onClick={togglePlay}
          >
            <source src={host ? hostname + media : media} />
          </video>
        </Link>
      ) : (
        <video
          ref={videoRef}
          className="w-auto h-auto max-h-[calc(100vh-200px)] object-contain cursor-pointer"
          style={{ maxWidth: '100%' }}
          onClick={togglePlay}
        >
          <source src={host ? hostname + media : media} />
        </video>
      )}

      {/* Centered play/pause button */}
      <button 
        onClick={togglePlay}
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
          bg-black/50 p-4 rounded-full transition-opacity duration-200
          ${isHovering || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
      >
        {isPlaying ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white" />}
      </button>

      {/* Controls overlay */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent 
        p-4 transition-opacity duration-200 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Progress bar */}
        <div 
          ref={progressRef}
          onClick={handleProgressClick}
          className="w-full h-1 bg-white/30 rounded-full mb-2 cursor-pointer"
        >
          <div 
            className="h-full bg-white rounded-full relative"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 
              w-3 h-3 bg-white rounded-full shadow-lg" />
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleMute} className="text-white hover:text-gray-300">
              {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-24 accent-white hidden lg:block"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDiv;
