import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Your latest activity and notifications on Velo.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
