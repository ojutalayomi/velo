import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy and security",
  description: "Manage your password, sessions and privacy settings on Velo.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
