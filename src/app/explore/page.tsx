import { Suspense } from "react";
import Explore from "../../components/Explore";

export default function ExplorePage() {
  return (
    <Suspense fallback={<></>}>
      <Explore />
    </Suspense>
  );
}
