import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help and support",
  description: "Get help using Velo.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
