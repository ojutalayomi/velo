import type { Metadata, Viewport } from "next";
import "@/styles/accounts.css";
import Image from "next/image";
import Link from "next/link";
import React from "react";

import { WhatsApp, X } from "@/components/icons";

export const metadata: Metadata = {
  title: "Accounts | Velo",
  description: "Sign up or log in to your Velo account.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

const FEATURES = [
  "Connect with friends and family",
  "Share moments that matter",
  "Chat and call in real time",
];

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen w-full font-sans">
      {/* ── Left panel (desktop only) ── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-slate-50 p-10 sm:flex lg:w-[35%] dark:border-white/[0.06] dark:bg-zinc-950">
        {/* Ambient brand glow */}
        <div className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-brand/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 size-72 rounded-full bg-brand/10 blur-3xl" />

        {/* Dot grid decoration */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Logo */}
        <Link href="/home" className="relative z-10 flex w-fit items-center gap-0.5">
          <Image
            src="/velo11.png"
            className="-ml-1 -mr-3 size-11 drop-shadow-md"
            height={100}
            width={70}
            alt="Velo logo"
          />
          <span className="text-4xl font-bold text-foreground">elo</span>
        </Link>

        {/* Hero copy */}
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground">
              Be part of Velo
              <br />
              <span className="text-brand">today.</span>
            </h1>
            <p className="text-sm text-muted-foreground">What are you waiting for?</p>
          </div>

          {/* Feature list */}
          <ul className="flex flex-col gap-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-foreground/70">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15 dark:bg-brand/20">
                  <span className="size-1.5 rounded-full bg-brand" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <footer className="relative z-10 flex items-center justify-between text-xs text-muted-foreground/60">
          <span>© {new Date().getFullYear()} Velo, Inc. All rights reserved.</span>
          <div className="flex items-center gap-3 opacity-60 transition-opacity hover:opacity-100">
            <WhatsApp size={16} />
            <X size={16} />
          </div>
        </footer>
      </aside>

      {/* ── Right panel ── */}
      <main className="flex flex-1 flex-col items-center justify-center bg-background p-6 dark:bg-zinc-900/30">
        {children}
      </main>
    </div>
  );
}
