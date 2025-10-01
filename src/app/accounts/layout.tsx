import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles/accounts.css";
import React from "react";
import Image from "next/image";
import { WhatsApp, X } from "@/components/icons";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Accounts | Velo",
  description: "Sign Up, Login into your account today.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="secondary font-sans">
      <div className="containeer flex h-full items-center justify-between text-center w-full">
        <div className="bg-gradient-to-t from-black to-transparent py-2 hidden sm:flex flex-col h-full w-1/2 !justify-between">
          <div className="flex flex-col justify-evenly text-left items-start mx-auto my-0 h-5/6">
            <Link href={"/home"} className="flex items-center !justify-start w-3/4">
              <Image
                src="/velo11.png"
                className="-ml-5 -mr-4"
                height={100}
                width={70}
                alt="brand logo"
              />
              <abbr className="text-4xl font-bold mt-2" title="Velo is?">
                elo
              </abbr>
            </Link>
            <div className="flex flex-col gap-1 text-white">
              <p className="font-bold text-4xl">Be part of Velo today</p>
              <p>What are you wating for?</p>
            </div>
          </div>
          <div className="flex items-center justify-around gap-1 my-2 text-white text-xs">
            <div>© 2024 Velo, Inc. All Rights Reserved.</div>
            <div className="flex items-center gap-2">
              <WhatsApp size={20} />
              <X size={20} />
            </div>
          </div>
        </div>
        <div className="flex flex-col flex-1 h-full items-center justify-center p-4 w-1/2">
          {children}
        </div>
      </div>
    </div>
  );
}
