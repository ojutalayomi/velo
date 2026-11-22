import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat settings",
  description: "Manage settings for this chat.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
