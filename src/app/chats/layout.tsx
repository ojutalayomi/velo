import type { Metadata } from "next";
import React from "react";

import App from "./clientComps";

export const metadata: Metadata = {
  title: "Chats",
  description: "Your conversations on Velo.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <App>{children}</App>;
}
