"use client";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

import { cn } from "@/lib/utils";

/** Sticky page header with a back button. */
export function SettingsHeader({ title, backTo }: { title: string; backTo: string }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-10 border-b backdrop-blur dark:border-zinc-800">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-3 py-2">
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.push(backTo)}
          className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
    </header>
  );
}

/** A titled, rounded group of rows. */
export function SettingsGroup({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      {title && (
        <h2 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </h2>
      )}
      {description && <p className="mb-2 px-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      <div className="divide-y overflow-hidden rounded-2xl border bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {children}
      </div>
    </section>
  );
}

/** Accessible on/off switch. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand" : "bg-gray-300 dark:bg-zinc-700"
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

interface RowProps {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  /** Renders a chevron and makes the row a link. */
  href?: string;
  onClick?: () => void;
  /** Right-hand control (e.g. a Switch). */
  trailing?: React.ReactNode;
  destructive?: boolean;
}

/** One row: optional icon tile, text, and a trailing control or chevron. */
export function SettingsRow({
  icon,
  label,
  description,
  href,
  onClick,
  trailing,
  destructive,
}: RowProps) {
  const content = (
    <>
      {icon && (
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-800",
            destructive ? "text-red-500" : "text-gray-700 dark:text-gray-300"
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1 text-left">
        <p className={cn("font-medium", destructive && "text-red-500")}>{label}</p>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      {trailing ?? (href && <ChevronRight className="size-5 shrink-0 text-gray-400" />)}
    </>
  );
  const base = "flex w-full items-center gap-3 px-4 py-3.5";
  const interactive = "transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/60";

  if (href) {
    return (
      <Link href={href} className={cn(base, interactive)}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, interactive)}>
        {content}
      </button>
    );
  }
  return <div className={base}>{content}</div>;
}
