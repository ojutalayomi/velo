import { VolumeX, Volume2, Play, Pause } from "lucide-react";
import Link from "next/link";
import React, { useState, useRef, useEffect, useCallback } from "react";

import { VideoProps } from "../components/ImgVidProps";

const VideoDiv: React.FC<VideoProps> = ({ media, link = "", host }) => {
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
  const hostname = "https://s3.amazonaws.com/post-s/";

  // Memoize event handlers to prevent recreation
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

  // Intersection Observer to detect visibility
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
          // Pause video when not visible
          if (videoRef.current) {
            if (!entry.isIntersecting && !videoRef.current.paused) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: 0.5 } // Consider visible when 50% is in viewport
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Only attach event listeners when video is visible
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVisible) return;

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [isVisible, handleTimeUpdate, handleLoadedMetadata]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current && isVisible) {
      videoRef.current.volume = volume;
    }
  }, [volume, isVisible]);

  useEffect(() => {
    if (videoRef.current && isVisible) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, isVisible]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * duration;
    }
  }, [duration]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    if (isMuted) {
      setVolume(volume === 0 ? 1 : volume);
    }
  }, [isMuted, volume]);

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => setIsHovering(false), []);

  return (
    <div
      ref={containerRef}
      className="group relative flex h-full items-center justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {link ? (
        <Link href={link} className="z-[1]">
          <video
            ref={videoRef}
            className="size-auto max-h-[calc(100vh-200px)] cursor-pointer object-contain"
            style={{ minWidth: "100%" }}
            onClick={togglePlay}
            preload="metadata"
          >
            <source src={host ? hostname + media : media} />
          </video>
        </Link>
      ) : (
        <video
          ref={videoRef}
          className="size-auto max-h-[calc(100vh-200px)] cursor-pointer object-contain"
          style={{ minWidth: "100%" }}
          onClick={togglePlay}
          preload="metadata"
        >
          <source src={host ? hostname + media : media} />
        </video>
      )}

      {/* Centered play/pause button */}
      <button
        onClick={togglePlay}
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform 
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
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 
        transition-opacity duration-200 ${isHovering ? "opacity-100" : "opacity-0"}`}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="mb-2 h-1 w-full cursor-pointer rounded-full bg-white/30"
        >
          <div
            className="relative h-full rounded-full bg-white"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          >
            <div
              className="absolute right-0 top-1/2 size-3 -translate-y-1/2 translate-x-1/2 
              transform rounded-full bg-white shadow-lg"
            />
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-white">
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
              className="hidden w-24 accent-white lg:block"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDiv;
