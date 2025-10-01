import React, { useRef, useState, useEffect, MouseEvent, TouchEvent } from "react";
import { VideoOff } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Position {
  x: number;
  y: number;
}

interface DraggableVideoCardProps {
  isVideoOn?: boolean;
  className?: string;
}

export default function DraggableVideoCard({
  isVideoOn = false,
  className = "",
}: DraggableVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>): void => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>): void => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  };

  const handleMove = (clientX: number, clientY: number): void => {
    if (isDragging && cardRef.current) {
      const cardRect = cardRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = clientX - dragStart.x;
      let newY = clientY - dragStart.y;

      // Apply boundaries
      newX = Math.max(0, Math.min(viewportWidth - cardRect.width, newX));
      newY = Math.max(0, Math.min(viewportHeight - cardRect.height, newY));

      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>): void => {
    handleMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleEnd = (): void => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleResize = (): void => {
      if (cardRef.current) {
        const cardRect = cardRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        setPosition((prev) => ({
          x: Math.min(Math.max(0, prev.x), viewportWidth - cardRect.width),
          y: Math.min(Math.max(0, prev.y), viewportHeight - cardRect.height),
        }));
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const baseClassName =
    "mobile:absolute tablets1:relative bg-gray-900 dark:bg-gray-800 rounded-lg overflow-hidden border-0 mobile:m-3 mobile:z-[1] mobile:h-[30dvh] mobile:aspect-[9/16] cursor-move";

  return (
    <Card
      ref={cardRef}
      className={`${baseClassName} ${className}`.trim()}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        touchAction: "none",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleEnd}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${!isVideoOn ? "hidden" : ""}`}
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
  );
}
