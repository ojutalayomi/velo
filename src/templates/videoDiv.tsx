import { VolumeX, Volume2, Play, Pause } from "lucide-react";
import Link from "next/link";
import React, { useState, useRef, useEffect, useCallback } from "react";

import { VideoProps } from "../components/ImgVidProps";

const VideoDiv: React.FC<VideoProps> = ({ media, link = "" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Intersection Observer to detect visibility
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
          if (videoRef.current && !entry.isIntersecting && !videoRef.current.paused) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Only attach event listeners when video is visible
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVisible) return;

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleVideoEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleVideoEnded);
    };
  }, [isVisible, handleTimeUpdate, handleLoadedMetadata, handleVideoEnded]);

  const togglePlay = useCallback((e?: React.MouseEvent) => {
    // Prevent navigating if clicking the video inside a Link component wrapper
    if (e) e.preventDefault();
    
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch((err) => {
          console.error("Autoplay/Play blocked by browser:", err);
        });
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

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

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (progressRef.current && videoRef.current && duration) {
        const rect = progressRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        videoRef.current.currentTime = pos * duration;
      }
    },
    [duration]
  );

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    if (isMuted && volume === 0) {
      setVolume(1);
    }
  }, [isMuted, volume]);

  // Core video element component to avoid repetitive code blocks
  const VideoElement = (
    <video
      ref={videoRef}
      src={media} // Fixed dynamic source update issue
      className="size-auto max-h-[calc(100vh-200px)] cursor-pointer object-contain"
      style={{ minWidth: "100%" }}
      onClick={togglePlay}
      preload="metadata"
      playsInline
    />
  );

  return (
    <div
      ref={containerRef}
      className="group relative flex h-full items-center justify-center"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {link ? (
        <Link href={link} className="z-[1] w-full">
          {VideoElement}
        </Link>
      ) : (
        VideoElement
      )}

      {/* Centered play/pause button */}
      <button
        onClick={togglePlay}
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform z-[2]
          rounded-full bg-black/50 p-4 transition-opacity duration-200
          ${isHovering || !isPlaying ? "opacity-100" : "opacity-0"}`}
      >
        {isPlaying ? (
          <Pause size={24} className="text-white" />
        ) : (
          <Play size={24} className="text-white" />
        )}
      </button>

      {/* Controls overlay */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 z-[2]
        transition-opacity duration-200 flex flex-col gap-3 ${isHovering ? "opacity-100" : "opacity-0"}`}
      >
        {/* Progress bar container with padding to make clicking easier */}
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="group/track relative h-3 w-full cursor-pointer flex items-center"
        >
          {/* Base Track */}
          <div className="h-1 w-full rounded-full bg-white/30 overflow-hidden transition-all group-hover/track:h-1.5">
            {/* Filled Track */}
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          
          {/* Progress Handle (Thumb) pinned perfectly to the edge of the filled track width */}
          <div
            className="absolute size-3 rounded-full bg-white shadow-md top-1/2 -translate-y-1/2 -translate-x-1/2
            opacity-0 scale-75 group-hover/track:opacity-100 group-hover/track:scale-100 transition-all duration-150"
            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Bottom controls row */}
        <div className="flex items-center justify-between h-6">
          {/* Left: Time Indicator */}
          <div className="flex items-center">
            <span className="text-xs font-medium text-white tabular-nums select-none tracking-wider">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right: Volume Controls */}
          <div className="flex items-center gap-2 group/volume">
            <button 
              onClick={toggleMute} 
              className="text-white hover:text-gray-200 transition-colors p-1"
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="hidden lg:block w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white transition-all outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDiv;