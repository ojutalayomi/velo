import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Group media",
  description: "Photos, videos and files shared in this group.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
