"use client";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";
import React, { useMemo } from "react";

import { Attachment, MessageAttributes } from "@/lib/types/type";
import { cn } from "@/lib/utils";

/** Full-height page shell shared by the DM and group settings screens. */
export const SettingsShell: React.FC<{
  title: string;
  onBack: () => void;
  children?: React.ReactNode;
}> = ({ title, onBack, children }) => (
  <div className="absolute z-10 flex size-full max-h-screen min-h-screen flex-1 flex-col overflow-hidden bg-gray-50 tablets1:w-1/2 dark:bg-neutral-900">
    <header className="flex shrink-0 items-center gap-2 border-b bg-white/80 px-3 py-2.5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800"
      >
        <ArrowLeft className="size-5" />
      </button>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
    </header>
    <div className="flex-1 overflow-y-auto">
      <main className="mx-auto w-full max-w-xl space-y-6 p-4 pb-12">{children}</main>
    </div>
  </div>
);

export const SettingsSection: React.FC<{
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, action, children }) => (
  <section>
    {(title || action) && (
      <div className="mb-2 flex items-center justify-between px-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {title}
        </h2>
        {action}
      </div>
    )}
    <div className="divide-y overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:divide-neutral-700 dark:border-neutral-800 dark:bg-neutral-800">
      {children}
    </div>
  </section>
);

type Tone = "brand" | "amber" | "blue" | "green" | "purple" | "pink" | "red";
const TONES: Record<Tone, string> = {
  brand: "bg-brand/10 text-brand",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  green: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  pink: "bg-pink-50 text-pink-600 dark:bg-pink-950 dark:text-pink-400",
  red: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

/** A single settings line: tinted icon, title + subtitle, and a trailing control. */
export const SettingsRow: React.FC<{
  icon: React.ElementType;
  tone?: Tone;
  title: string;
  description?: React.ReactNode;
  destructive?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}> = ({ icon: Icon, tone = "brand", title, description, destructive, onClick, children }) => {
  const body = (
    <>
      <div className="flex min-w-0 items-center gap-3.5">
        <div className={cn("shrink-0 rounded-xl p-2.5", TONES[destructive ? "red" : tone])}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <h3
            className={cn(
              "font-medium",
              destructive ? "text-red-600" : "text-gray-900 dark:text-white"
            )}
          >
            {title}
          </h3>
          {description && (
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>
      {children}
    </>
  );
  const base = "flex w-full items-center justify-between gap-4 p-4 text-left";
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cn(base, "transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900")}
    >
      {body}
    </button>
  ) : (
    <div className={base}>{body}</div>
  );
};

/** Small outlined button used for trailing actions inside a row. */
export const RowButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className,
  ...props
}) => (
  <button
    type="button"
    {...props}
    className={cn(
      "shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-neutral-600 dark:text-gray-300 dark:hover:bg-neutral-700",
      className
    )}
  />
);

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export const useSharedMedia = (messages: MessageAttributes[] | undefined, chatId?: string) =>
  useMemo(() => {
    const chatMessages = (messages?.filter((m) => m.chatId === chatId) ??
      []) as MessageAttributes[];
    const newestFirst = [...chatMessages].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const media: Attachment[] = [];
    const docs: Attachment[] = [];
    const links: string[] = [];
    const counts = { media: 0, docs: 0, links: 0 };

    for (const msg of newestFirst) {
      for (const att of msg.attachments ?? []) {
        if (typeof att === "string") continue;
        const kind = att.type?.split("/")[0];
        if (kind === "image" || kind === "video") {
          counts.media++;
          if (media.length < 4) media.push(att);
        } else if (kind !== "audio") {
          counts.docs++;
          if (docs.length < 2) docs.push(att);
        }
      }
      const found = msg.content?.match(URL_REGEX) ?? [];
      counts.links += found.length;
      for (const url of found) if (links.length < 2) links.push(url);
    }
    return { media, docs, links, counts };
  }, [messages, chatId]);

/** Preview card linking to the full media page. */
export const SharedMediaSection: React.FC<{
  href: string;
  data: ReturnType<typeof useSharedMedia>;
}> = ({ href, data }) => {
  const empty = !data.media.length && !data.docs.length && !data.links.length;
  const label = "flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400";
  const chip =
    "flex items-center gap-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-700 dark:bg-neutral-900 dark:text-gray-300";
  return (
    <SettingsSection
      title="Media, links & docs"
      action={
        <Link
          href={href}
          className="flex items-center gap-0.5 text-xs font-medium text-brand hover:underline"
        >
          See all <ChevronRight size={14} />
        </Link>
      }
    >
      {data.media.length > 0 && (
        <div className="space-y-2 p-4">
          <div className={label}>
            <ImageIcon size={14} className="text-brand" /> Media ({data.counts.media})
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {data.media.map((att, i) => (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-neutral-900"
              >
                {att.type?.startsWith("video") ? (
                  <video src={att.url} className="size-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={att.url} alt={att.name} className="size-full object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {data.docs.length > 0 && (
        <div className="space-y-2 p-4">
          <div className={label}>
            <FileText size={14} className="text-brand" /> Documents ({data.counts.docs})
          </div>
          {data.docs.map((att, i) => (
            <div key={i} className={chip}>
              <FileText size={16} className="shrink-0 text-brand" />
              <span className="truncate">{att.name}</span>
            </div>
          ))}
        </div>
      )}
      {data.links.length > 0 && (
        <div className="space-y-2 p-4">
          <div className={label}>
            <LinkIcon size={14} className="text-blue-500" /> Links ({data.counts.links})
          </div>
          {data.links.map((url, i) => (
            <div key={i} className={chip}>
              <LinkIcon size={16} className="shrink-0 text-blue-500" />
              <span className="truncate">{url}</span>
            </div>
          ))}
        </div>
      )}
      {empty && (
        <p className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
          No media, links, or documents yet
        </p>
      )}
    </SettingsSection>
  );
};
