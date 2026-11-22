import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect account",
  description: "Review and approve the sign-in provider connection.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
