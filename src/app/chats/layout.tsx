import type { Metadata,Viewport } from "next";
// import { Inter } from "next/font/google";
import React, {useState} from "react";
// import Image from 'next/image';
import App from './clientComps';

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chats | Velo",
  description: "Created by Ayomide",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode;}>) {

    return (
      <App >
        {children}
      </App>
    )
}
