import { Code2, Lock, Plug, Radio } from "lucide-react";
import type { Metadata } from "next";

import { Callout, CtaLink, FeatureCard, InfoPage, Section } from "@/components/info/InfoPage";

export const metadata: Metadata = {
  title: "API | Velo",
  description: "Build with Velo. Our developer platform is in early access.",
};

export default function DevelopersPage() {
  return (
    <InfoPage
      current="/developers"
      eyebrow="Developers"
      icon={<Code2 className="size-4" />}
      title="Build on Velo"
      intro="We're working on a public API so you can create bots, integrations and tools that connect to Velo."
    >
      <Callout>
        <strong>Early access.</strong> The Velo API isn&apos;t publicly available yet. Tell us what
        you&apos;d like to build and we&apos;ll reach out as access opens up.
      </Callout>

      <Section title="What's planned" className="pt-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard icon={<Radio className="size-5" />} title="Posts and profiles">
            Read public posts and profiles, and publish on behalf of a user who has granted access.
          </FeatureCard>
          <FeatureCard icon={<Plug className="size-5" />} title="Real-time events">
            Subscribe to messages, mentions and reactions over WebSockets.
          </FeatureCard>
          <FeatureCard icon={<Lock className="size-5" />} title="OAuth and scopes">
            Users stay in control: apps request only the permissions they need and can be revoked at
            any time.
          </FeatureCard>
          <FeatureCard icon={<Code2 className="size-5" />} title="Webhooks and SDKs">
            Typed client libraries and webhooks to keep your integration simple.
          </FeatureCard>
        </div>
      </Section>

      <Section title="A taste of the API">
        <p>Illustrative only. Endpoints and shapes will change before release.</p>
        <pre className="overflow-x-auto rounded-xl border border-border/60 bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
          <code>{`GET /v1/users/{username}/posts?limit=20
Authorization: Bearer <access_token>

{
  "data": [{ "id": "…", "text": "Hello, Velo!", "createdAt": "…" }],
  "nextCursor": "…"
}`}</code>
        </pre>
      </Section>

      <Section title="Get notified">
        <p>Share your idea through the feedback form and select &ldquo;API&rdquo; in your note.</p>
        <CtaLink href="/feedback">Request access</CtaLink>
      </Section>
    </InfoPage>
  );
}
