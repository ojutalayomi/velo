import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Explore",
  description: "Explore trending posts, people and topics on Velo.",
  keywords: [],
  authors: [],
  creator: "",
  publisher: "",
  robots: "index, follow",
  openGraph: {
    title: "Explore",
    description: "Explore",
    url: "",
    siteName: "Velo",
    images: [],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore",
    description: "Explore",
    images: [],
  },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
