import { Download, Newspaper } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { Card, CtaLink, InfoPage, Section } from "@/components/info/InfoPage";

export const metadata: Metadata = {
  title: "Press",
  description: "Press resources, brand assets and company facts for Velo.",
};

const FACTS: [string, string][] = [
  ["Product", "Velo, a social platform with posts, real-time chat and calls"],
  ["Platform", "Web app, installable as a PWA on mobile and desktop"],
  ["Based in", "Nigeria"],
  ["Brand colour", "#FF6257"],
];

export default function PressPage() {
  return (
    <InfoPage
      current="/press"
      eyebrow="Press"
      icon={<Newspaper className="size-4" />}
      title="Velo for the press"
      intro="Everything you need to write accurately about Velo: a short description, key facts and our logo."
    >
      <Section title="In one sentence">
        <Card>
          <p className="text-lg leading-relaxed">
            Velo is a modern social platform for sharing, connecting and discovering new content,
            with real-time chat and calling built in.
          </p>
        </Card>
      </Section>

      <Section title="Quick facts">
        <dl className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-white dark:divide-white/6 dark:border-white/8 dark:bg-zinc-900">
          {FACTS.map(([k, v]) => (
            <div key={k} className="grid gap-1 px-5 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="text-sm text-muted-foreground">{k}</dt>
              <dd className="text-sm font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Logo">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex h-40 items-center justify-center rounded-2xl border border-border/60 bg-white">
            <Image
              src="/velo11.png"
              alt="Velo logo on light background"
              width={70}
              height={100}
              className="size-20 object-contain"
            />
          </div>
          <div className="flex h-40 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900">
            <Image
              src="/velo11.png"
              alt="Velo logo on dark background"
              width={70}
              height={100}
              className="size-20 object-contain"
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Please don&apos;t stretch, recolour or add effects to the logo, and leave clear space
          around it equal to its width.
        </p>
        <a
          href="/velo11.png"
          download
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
        >
          <Download className="size-4" />
          Download logo (PNG)
        </a>
      </Section>

      <Section title="Press enquiries">
        <p>
          For interviews, comments or corrections, reach out through our feedback form and mark your
          message &ldquo;Press&rdquo;. We&apos;ll get back to you as soon as we can.
        </p>
        <CtaLink href="/feedback">Contact us</CtaLink>
      </Section>
    </InfoPage>
  );
}
