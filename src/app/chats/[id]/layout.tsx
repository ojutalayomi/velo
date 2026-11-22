import type { Metadata } from "next";
import * as React from "react";
import ChatPage from "./clientComps";

export const metadata: Metadata = {
  title: "Chat",
  description: "Private conversation on Velo.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ChatPage>{children}</ChatPage>;
}
