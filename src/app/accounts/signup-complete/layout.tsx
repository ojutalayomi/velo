import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome to Velo",
  description: "Your Velo account is ready.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
