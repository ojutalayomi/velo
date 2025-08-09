import type { Metadata, Viewport } from "next";
import { myCustomFont } from '../lib/fonts'
import { SpeedInsights } from "@vercel/speed-insights/next"
import '@/styles/style.css';
import './globals.css';
import ClientComponents from "./clientComps";
import React from "react";
import Providers from "./providers";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Velo App",
  description: "Created by Ayomide",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0
}

export default function RootLayout({ children, modal }: Readonly<{ children: React.ReactNode; modal: React.ReactNode; }>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-title" content="Velo" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`selection:bg-tomatom-300 dark:bg-bgDark dark:bg-black ${myCustomFont.className}`} suppressHydrationWarning>
        <Providers>
          <SpeedInsights />
            <ClientComponents>
              {children}
            </ClientComponents>
            {modal}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
