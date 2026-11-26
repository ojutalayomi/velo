import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import React from "react";

import { cn } from "@/lib/utils";

export const INFO_LINKS = [
  { href: "/about", label: "About" },
  { href: "/help-support", label: "Help" },
  { href: "/press", label: "Press" },
  { href: "/developers", label: "API" },
  { href: "/jobs", label: "Jobs" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/locations", label: "Locations" },
] as const;

interface InfoPageProps {
  eyebrow: string;
  title: string;
  intro?: React.ReactNode;
  /** Current pathname, used to highlight the page in the bottom nav. */
  current: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * Shared layout for Velo's public information pages (About, Press, Jobs, …).
 * The app shell hides overflow on #detail, so this owns its own scroll area.
 */
export function InfoPage({ eyebrow, title, intro, current, children, icon }: InfoPageProps) {
  return (
    <main className="h-dvh w-full overflow-y-auto bg-gray-50 text-foreground dark:bg-zinc-950">
      <header className="relative overflow-hidden border-b border-border/60 bg-white dark:border-white/6 dark:bg-zinc-900">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-brand/15 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-5 pb-10 pt-6 sm:px-8 sm:pb-14">
          <Link
            href="/home"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Velo
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand">
            {icon}
            {eyebrow}
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            {title}
          </h1>
          {intro && (
            <div className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {intro}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">{children}</div>

      <nav
        aria-label="More about Velo"
        className="mx-auto max-w-3xl border-t border-border/60 px-5 pb-16 pt-6 sm:px-8 dark:border-white/6"
      >
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {INFO_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={l.href === current ? "page" : undefined}
                className={cn(
                  "transition-colors hover:text-foreground hover:underline",
                  l.href === current ? "font-semibold text-brand" : "text-muted-foreground"
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">© {new Date().getFullYear()} Velo</p>
      </nav>
    </main>
  );
}

export function Section({
  id,
  title,
  children,
  className,
}: {
  id?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-6 py-6 first:pt-0", className)}>
      {title && <h2 className="mb-3 text-xl font-semibold tracking-tight">{title}</h2>}
      <div className="space-y-3 leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}

/** Long-form text with sensible list/link styling, for legal pages. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-a:text-brand prose-headings:tracking-tight sm:prose-base">
      {children}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-white p-5 shadow-xs dark:border-white/8 dark:bg-zinc-900",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="transition-colors hover:border-brand/40">
      <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </Card>
  );
}

export function Callout({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "warn";
}) {
  return (
    <div
      role="note"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm leading-relaxed",
        tone === "warn"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          : "border-brand/30 bg-brand/5 text-foreground/80"
      )}
    >
      {children}
    </div>
  );
}

export function CtaLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-semibold transition-all",
        variant === "primary"
          ? "bg-brand text-white shadow-xs hover:brightness-110"
          : "border border-border bg-transparent hover:border-brand/50 hover:bg-brand/5"
      )}
    >
      {children}
      <ArrowUpRight className="size-4" />
    </Link>
  );
}

/** Table of contents for long documents. */
export function Toc({ items }: { items: { id: string; label: string }[] }) {
  return (
    <Card className="mb-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        On this page
      </p>
      <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {items.map((i, n) => (
          <li key={i.id}>
            <a href={`#${i.id}`} className="text-foreground/80 hover:text-brand hover:underline">
              {n + 1}. {i.label}
            </a>
          </li>
        ))}
      </ol>
    </Card>
  );
}
