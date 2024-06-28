import type { Metadata,Viewport } from "next";
import { Inter } from "next/font/google";
import '@/styles/style.css';
import ClientComponents from "./clientComps";
import React, {useState} from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Velo App",
  description: "Created by Ayomide",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode;}>) {

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
          <div id='root'>
          <ClientComponents>{children}</ClientComponents>
          </div>
      </body>
    </html>
  );
}
