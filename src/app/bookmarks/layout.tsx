import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bookmarks",
  description: "Posts you've saved on Velo.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
