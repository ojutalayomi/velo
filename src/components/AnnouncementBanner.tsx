"use client";
import { Megaphone, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/announcements");
        if (!res.ok) return;
        const { data } = (await res.json()) as { data: Announcement | null };
        let dismissed: string | null = null;
        try {
          dismissed = localStorage.getItem(KEY);
        } catch {}
        if (!cancelled && data && data.id !== dismissed) setItem(data);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
