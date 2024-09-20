import type { Metadata } from "next";
import React from "react";
import App from './clientComps';

export const metadata: Metadata = {
  title: "Chats | Velo",
  description: "Chats",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode;}>) {

    return (
      <App >
        {children}
      </App>
    )
}
