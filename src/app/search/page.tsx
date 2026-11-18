"use client";

import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { CaptionSearchFeed } from "@/components/CaptionSearchFeed";

function SearchPageInner() {
  const searchParams = useSearchParams();
  const q = searchParams?.get("q") ?? "";

  return <CaptionSearchFeed variant="search" queryFromUrl={q} />;
}

function SearchFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f4f6f8] text-zinc-500 dark:bg-zinc-950">
      <Loader2 className="size-8 animate-spin text-zinc-400" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchPageInner />
    </Suspense>
  );
}
