import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Muted and blocked accounts",
  description: "See and undo the accounts you have muted or blocked on Velo.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
