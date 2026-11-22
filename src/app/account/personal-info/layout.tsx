import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personal information",
  description: "Update your name, email and other personal details on Velo.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
