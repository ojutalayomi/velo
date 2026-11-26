import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import TrendingTopics from "@/components/TrendingTopics";

export const metadata: Metadata = {
  title: "Trending",
  description: "Discover the public conversations trending on Velo in the last 24 hours.",
};

export default function TrendingPage() {
  return (
    <main className="h-full min-h-screen overflow-auto bg-gray-50 pb-24 dark:bg-zinc-950 dark:text-slate-200">
      <header className="sticky top-0 z-10 border-b bg-gray-50/90 px-4 py-2 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <Link
            href="/explore"
            aria-label="Back to Explore"
            className="flex rounded-full p-2 shadow-sm hover:bg-accent"
          >
            <ArrowLeft size={18} />
          </Link>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Explore</span>
        </div>
      </header>
      <div className="mx-auto max-w-xl px-4 pt-4">
        <TrendingTopics variant="page" />
      </div>
    </main>
  );
}
