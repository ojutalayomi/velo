"use client";

import { useEffect, useRef, useState } from "react";

interface PostAnalyticsProps {
  postId: string;
  userId?: string;
}

interface AnalyticsData {
  postId: string;
  event: "view" | "scroll" | "time" | "engagement";
  metadata?: {
    scrollDepth?: number;
    timeOnPage?: number;
    referrer?: string;
    userAgent?: string;
  };
}

export default function PostAnalytics({ postId, userId }: PostAnalyticsProps) {
  const [scrollDepth, setScrollDepth] = useState(0);
  const [timeOnPage, setTimeOnPage] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const viewTrackedRef = useRef<boolean>(false);
  const scrollTrackedRef = useRef<Set<number>>(new Set());
  const timeTrackedRef = useRef<Set<number>>(new Set());

  // Track initial view
  useEffect(() => {
    if (!viewTrackedRef.current && postId) {
      viewTrackedRef.current = true;
      trackEvent({
        postId,
        event: "view",
        metadata: {
          referrer: document.referrer,
          userAgent: navigator.userAgent,
        },
      });
    }
  }, [postId]);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollableHeight = documentHeight - windowHeight;
      const currentScrollDepth = scrollableHeight > 0 
        ? Math.round((scrollTop / scrollableHeight) * 100) 
        : 0;

      setScrollDepth(currentScrollDepth);

      // Track scroll milestones (25%, 50%, 75%, 100%)
      const milestones = [25, 50, 75, 100];
      milestones.forEach((milestone) => {
        if (
          currentScrollDepth >= milestone &&
          !scrollTrackedRef.current.has(milestone)
        ) {
          scrollTrackedRef.current.add(milestone);
          trackEvent({
            postId,
            event: "scroll",
            metadata: {
              scrollDepth: milestone,
            },
          });
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [postId]);

  // Track time on page
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeOnPage(elapsed);

      // Track time milestones (10s, 30s, 60s, 120s)
      const milestones = [10, 30, 60, 120];
      milestones.forEach((milestone) => {
        if (elapsed >= milestone && !timeTrackedRef.current.has(milestone)) {
          timeTrackedRef.current.add(milestone);
          trackEvent({
            postId,
            event: "time",
            metadata: {
              timeOnPage: milestone,
            },
          });
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [postId]);

  // Track final engagement metrics on unmount
  useEffect(() => {
    return () => {
      const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (finalTime > 5) {
        // Only track if user spent more than 5 seconds
        trackEvent({
          postId,
          event: "engagement",
          metadata: {
            scrollDepth,
            timeOnPage: finalTime,
          },
        });
      }
    };
  }, [postId, scrollDepth]);

  const trackEvent = async (data: AnalyticsData) => {
    try {
      await fetch("/api/analytics/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error) {
      // Silently fail - analytics shouldn't break the app
      console.error("Failed to track analytics:", error);
    }
  };

  // This component doesn't render anything
  return null;
}

