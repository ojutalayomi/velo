import type { Metadata } from "next";
import Link from "next/link";

import TrendingTopics from "@/components/TrendingTopics";

export const metadata: Metadata = {
  title: "Trending | Velo",
  description: "Discover the public conversations trending on Velo in the last 24 hours.",
};

export default function TrendingPage() {
  return (
    <main className="h-full min-h-screen overflow-auto bg-gray-50 px-4 pb-24 pt-6 dark:bg-zinc-950 dark:text-slate-200">
      <div className="mx-auto max-w-xl space-y-4">
        <Link href="/explore" className="inline-block text-sm text-brand hover:underline py-4">
          ← Explore
        </Link>
        <h1 className="text-2xl font-semibold">Trending conversations</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ranked by the number of people posting, then post count and recency. Updated about every
          five minutes.
        </p>
        <TrendingTopics variant="page" />
      </div>
    </main>
  );
}
