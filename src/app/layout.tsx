import type { Metadata, Viewport } from "next";
import { myCustomFont } from "../lib/fonts";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/style.css";
import "./globals.css";
import ClientComponents from "./clientComps";
import React from "react";
import Providers from "./providers";
import { Toaster } from "@/components/ui/toaster";

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
        {/* <meta property="twitter:image" content="Twitter link preview image URL" />
        <meta property="twitter:card" content="Twitter link preview card" />
        <meta property="twitter:title" content="Twitter link preview title" />
        <meta property="twitter:description" content="Twitter link preview description" />
        <meta property="og:image" content="Link preview image URL" />
        <meta property="og:site_name" content="Velo" />
        <meta property="og:title" content="Link preview title" />
        <meta property="og:description" content="Link preview description" />
        <meta property="og:url" content="Link preview URL" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_US" /> */}
      </head>
      <body
        className={`selection:bg-tomatom-300 dark:bg-bgDark dark:bg-black ${myCustomFont.className}`}
        suppressHydrationWarning
      >
        <Providers>
          <SpeedInsights />
          <ClientComponents>{children}</ClientComponents>
          {modal}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
