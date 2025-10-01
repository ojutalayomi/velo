"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function SlideOverTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 10);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className={`slide-in ${isTransitioning ? "slide-in-active" : ""} max-h-screen`}>
      {children}
    </div>
  );
}
