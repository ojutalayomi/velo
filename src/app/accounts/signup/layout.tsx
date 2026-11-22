import type { Metadata, Viewport } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your Velo account.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
