import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import React from "react";

import "@/styles/style.css";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

import ClientComponents from "./clientComps";
import Providers from "./providers";
import { myCustomFont } from "../lib/fonts";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
const description =
  "Velo is a modern social platform for sharing, connecting, and discovering new content.";
const title = "Velo App";
const siteName = "Velo";
const image = baseUrl + "/velo11.png";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    images: [
      {
        url: image,
      },
    ],
    siteName,
    title,
    description,
    url: baseUrl,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    images: [
      {
        url: image,
      },
    ],
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-title" content={siteName} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`selection:bg-tomatom-300 dark:bg-black dark:bg-bgDark ${myCustomFont.className}`}
        suppressHydrationWarning
      >
        <Providers>
          <TooltipProvider delayDuration={200}>
            <SpeedInsights />
            <ClientComponents>{children}</ClientComponents>
            {modal}
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
