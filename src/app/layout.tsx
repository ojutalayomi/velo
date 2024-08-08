import type { Metadata,Viewport } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next"
import '@/styles/style.css';
import './globals.css';
import ClientComponents from "./clientComps";
import React, {useState} from "react";
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { ThemeProvider } from "./providers";
import { usePathname } from 'next/navigation';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Velo App",
  description: "Created by Ayomide",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0
}

export default function RootLayout({ children, modal }: Readonly<{ children: React.ReactNode; modal: React.ReactNode;}>) {

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <UserProvider>
        <ThemeProvider>
          <body className='selection:bg-tomatom-300 dark:bg-bgDark dark:bg-black'>
            <SpeedInsights />
            <div id='root'>
            <ClientComponents>{children}</ClientComponents>
            {modal}
            </div>
          </body>
        </ThemeProvider>
      </UserProvider>
    </html>
  );
}
