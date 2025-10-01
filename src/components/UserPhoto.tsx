"use client";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";

interface FullScreenMediaProps {
  alt: string;
  description: string;
}

const FullScreenMedia: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ username: string }>();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const src = `/${params?.username}/photos`; //https://s3.amazonaws.com/profile-display-images/
  const description = "";

  useEffect(() => {
    const get = async () => {
      const response = await fetch(`/${params}/photo`, {
        method: "POST",
      });

      if (response.ok) {
        const image = response.blob();
      } else {
        const errorText = await response.text();
        // Try to parse the response to see if it contains a custom error message
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || "Network response was not ok");
      }
    };
    // get();
  }, [params]);

  const toggleFullScreen = () => {
    setIsFullScreen(false);
    router.push("/home");
  };

  if (!pathname?.endsWith("/photo")) return null;

  return (
    <div
      className={`fixed top-0 left-0 h-screen w-screen z-[100] bg-black/80 text-white flex flex-col justify-center items-center
      `}
    >
      <ChevronLeft
        size={25}
        className="absolute cursor-pointer dark:text-white top-[10px] left-[10px] m-[10px]"
        onClick={toggleFullScreen}
      />
      {src.includes(".mp4") ? (
        <video src={src} controls autoPlay loop muted className="max-h-full max-w-full" />
      ) : (
        <Image src={src} alt={`alt`} height={500} width={500} className="max-h-full max-w-full" />
      )}
      <p className="mt-4">{description}</p>
    </div>
  );
};

export default FullScreenMedia;
