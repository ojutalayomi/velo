import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email confirmation failed",
  description: "We couldn't confirm your email address.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
