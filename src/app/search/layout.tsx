import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description: "Search posts, people and hashtags on Velo.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
