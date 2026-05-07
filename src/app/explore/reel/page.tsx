import { Suspense } from "react";
import ExploreReel from "@/components/ExploreReel";

export default function ExploreReelPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full bg-black flex items-center justify-center">
          <div className="size-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      }
    >
      <ExploreReel />
    </Suspense>
  );
}
