import type { Metadata, Viewport } from "next";
import "@/styles/accounts.css";
import Image from "next/image";
import Link from "next/link";
import React from "react";

import { WhatsApp, X } from "@/components/icons";


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
      <div className="containeer flex size-full items-center justify-between text-center">
        <div className="hidden h-full w-1/2 flex-col !justify-between bg-gradient-to-t from-black to-transparent py-2 sm:flex">
          <div className="mx-auto my-0 flex h-5/6 flex-col items-start justify-evenly text-left">
            <Link href={"/home"} className="flex w-3/4 items-center !justify-start">
              <Image
                src="/velo11.png"
                className="-ml-5 -mr-4"
                height={100}
                width={70}
                alt="brand logo"
              />
              <abbr className="mt-2 text-4xl font-bold" title="Velo is?">
                elo
              </abbr>
            </Link>
            <div className="flex flex-col gap-1 text-white">
              <p className="text-4xl font-bold">Be part of Velo today</p>
              <p>What are you wating for?</p>
            </div>
          </div>
          <div className="my-2 flex items-center justify-around gap-1 text-xs text-white">
            <div>© 2024 Velo, Inc. All Rights Reserved.</div>
            <div className="flex items-center gap-2">
              <WhatsApp size={20} />
              <X size={20} />
            </div>
          </div>
        </div>
        <div className="flex h-full w-1/2 flex-1 flex-col items-center justify-center p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
