import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email confirmed",
  description: "Your email address has been confirmed.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
