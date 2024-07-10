import type { Metadata,Viewport } from "next";
import { Inter } from "next/font/google";
import '@/styles/style.css';
import './globals.css';
import ClientComponents from "./clientComps";
import React, {useState} from "react";
import { UserProvider } from '@auth0/nextjs-auth0/client';

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
      <UserProvider>
        <body className='selection:bg-pink-300'>
            <div id='root'>
            <ClientComponents>{children}</ClientComponents>
            </div>
        </body>
      </UserProvider>
    </html>
  );
}
