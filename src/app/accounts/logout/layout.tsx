import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log out",
  description: "Signing you out of Velo.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
