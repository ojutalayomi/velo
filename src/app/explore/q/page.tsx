import type { Metadata } from "next";
import { Suspense } from "react";
import Explore from "../../../components/Explore";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim();
  return query
    ? { title: `${query} - Search`, description: `Search results for "${query}" on Velo.` }
    : { title: "Search", description: "Search people and posts on Velo." };
}

export default function ExploreQPage() {
  return (
    <Suspense fallback={<></>}>
      <Explore />
    </Suspense>
  );
}
