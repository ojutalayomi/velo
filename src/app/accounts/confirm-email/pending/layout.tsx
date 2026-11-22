import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirm your email",
  description: "Check your inbox to confirm your email address.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
