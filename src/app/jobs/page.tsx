import { Briefcase, Globe2, HeartHandshake, Rocket } from "lucide-react";
import type { Metadata } from "next";

import { Card, CtaLink, FeatureCard, InfoPage, Section } from "@/components/info/InfoPage";

export const metadata: Metadata = {
  title: "Jobs | Velo",
  description: "Work on Velo. See how we work and how to get in touch about opportunities.",
};

export default function JobsPage() {
  return (
    <InfoPage
      current="/jobs"
      eyebrow="Jobs"
      icon={<Briefcase className="size-4" />}
      title="Help us build Velo"
      intro="We're a small team making a social app that feels fast and personal. We like people who ship, care about the details and enjoy working in the open."
    >
      <Section title="How we work">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard icon={<Rocket className="size-5" />} title="Ship small, ship often">
            Short cycles, real users and quick feedback.
          </FeatureCard>
          <FeatureCard icon={<Globe2 className="size-5" />} title="Remote friendly">
            We care about outcomes, not office hours.
          </FeatureCard>
          <FeatureCard icon={<HeartHandshake className="size-5" />} title="Kind and direct">
            Honest feedback, delivered with respect.
          </FeatureCard>
          <FeatureCard icon={<Briefcase className="size-5" />} title="Real ownership">
            You&apos;ll own meaningful parts of the product from day one.
          </FeatureCard>
        </div>
      </Section>

      <Section title="Open roles">
        <Card className="text-center">
          <p className="font-semibold">No open roles right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;re not hiring at the moment, but we&apos;re always happy to meet talented
            designers, engineers and community builders.
          </p>
          <div className="mt-4 flex justify-center">
            <CtaLink href="/feedback">Introduce yourself</CtaLink>
          </div>
        </Card>
      </Section>
    </InfoPage>
  );
}
