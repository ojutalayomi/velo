import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  let decoded = tag;
  try {
    decoded = decodeURIComponent(tag);
  } catch {}
  const label = `#${decoded.replace(/^#/, "").trim()}`;
  return {
    title: label,
    description: `Posts tagged ${label} on Velo.`,
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
