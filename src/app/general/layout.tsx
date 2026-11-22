import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "General settings",
  description: "Manage your general Velo preferences.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
