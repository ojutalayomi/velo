import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Group settings",
  description: "Manage settings for this group chat.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
