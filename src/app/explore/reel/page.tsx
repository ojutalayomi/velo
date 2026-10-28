import { Suspense } from "react";

import ExploreReel from "@/components/ExploreReel";

export default function ExploreReelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-black">
          <div className="size-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        </div>
      }
    >
      <ExploreReel />
    </Suspense>
  );
}
