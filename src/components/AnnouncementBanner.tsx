"use client";
import { Megaphone, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useSocket } from "@/app/providers/SocketProvider";

interface Announcement {
  id: string;
  title: string;
  message: string;
  url: string | null;
}

const KEY = "velo_dismissed_announcement";

/** Shows the newest live admin announcement until the user dismisses it. */
export default function AnnouncementBanner() {
  const [item, setItem] = useState<Announcement | null>(null);
  const socket = useSocket();

  const show = useCallback((data: Announcement | null) => {
    let dismissed: string | null = null;
    try {
      dismissed = localStorage.getItem(KEY);
    } catch {}
    setItem(data && data.id !== dismissed ? data : null);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements", { cache: "no-store" });
      if (!res.ok) return;
      show(((await res.json()) as { data: Announcement | null }).data);
    } catch {}
  }, [show]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (data: Announcement) => show(data);
    // Refetch rather than just clearing: an older live announcement may take over.
    const onRemoved = (data: { id: string }) => setItem((cur) => (cur?.id === data?.id ? null : cur));
    socket.on("announcement:new", onNew);
    socket.on("announcement:removed", onRemoved);
    // Catch anything missed while disconnected.
    socket.on("connect", load);
    return () => {
      socket.off("announcement:new", onNew);
      socket.off("announcement:removed", onRemoved);
      socket.off("connect", load);
    };
  }, [socket, show, load]);

  if (!item) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, item.id);
    } catch {}
    setItem(null);
  };

  const external = item.url?.startsWith("http");

  return (
    <div role="status" className="flex items-start gap-3 bg-brand px-4 py-2 text-sm text-foreground">
      <Megaphone className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <b>{item.title}</b> {item.message}{" "}
        {item.url &&
          (external ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="underline">
              Learn more
            </a>
          ) : (
            <Link href={item.url} className="underline">
              Learn more
            </Link>
          ))}
      </p>
      <button onClick={dismiss} aria-label="Dismiss announcement" className="shrink-0">
        <X className="size-4" />
      </button>
    </div>
  );
}
