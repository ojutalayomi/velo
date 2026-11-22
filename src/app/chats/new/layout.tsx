import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New chat",
  description: "Start a new conversation on Velo.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
