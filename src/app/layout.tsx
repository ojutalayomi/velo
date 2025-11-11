import type { Metadata, Viewport } from "next";
import { myCustomFont } from "../lib/fonts";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/style.css";
import "./globals.css";
import ClientComponents from "./clientComps";
import React from "react";
import Providers from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
const description =
  "Velo is a modern social platform for sharing, connecting, and discovering new content.";
const title = "Velo App";
const siteName = "Velo";
const image = baseUrl + "/velo11.png";

export const metadata: Metadata = {
  title: title,
  description: description,
  openGraph: {
    images: [
      {
        url: image,
      },
    ],
    siteName: siteName,
    title: title,
    description: description,
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
    title: title,
    description: description,
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
        className={`selection:bg-tomatom-300 dark:bg-bgDark dark:bg-black ${myCustomFont.className}`}
        suppressHydrationWarning
      >
        <Providers>
          <TooltipProvider delayDuration={200}>
            <SpeedInsights />
            <ClientComponents>{children}</ClientComponents>
            {modal}
          </TooltipProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
