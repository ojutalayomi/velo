import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared media",
  description: "Photos, videos and files shared in this chat.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
