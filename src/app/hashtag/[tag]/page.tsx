"use client";

import { useParams } from "next/navigation";

import { CaptionSearchFeed } from "@/components/CaptionSearchFeed";

export default function HashtagPage() {
  const params = useParams();
  const raw = params?.tag;
  const tag = decodeURIComponent(Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "")).trim();

  if (!tag) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8] p-6 dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Invalid hashtag.</p>
      </div>
    );
  }

  return <CaptionSearchFeed variant="hashtag" tag={tag} />;
}
