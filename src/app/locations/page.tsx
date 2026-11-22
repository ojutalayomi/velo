import { MapPin } from "lucide-react";
import type { Metadata } from "next";

import { Card, CtaLink, InfoPage, Section } from "@/components/info/InfoPage";

export const metadata: Metadata = {
  title: "Locations",
  description: "Where Velo is built and where it's available.",
};

export default function LocationsPage() {
  return (
    <InfoPage
      current="/locations"
      eyebrow="Locations"
      icon={<MapPin className="size-4" />}
      title="Built in Nigeria, open to the world"
      intro="Velo is made in Nigeria and works anywhere you have a connection."
    >
      <Section title="Where we are">
        <Card>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <MapPin className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold">Nigeria</h3>
              <p className="text-sm text-muted-foreground">
                Home of the Velo team. We work remotely and don&apos;t currently operate a public
                office.
              </p>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Availability">
        <p>
          Velo runs in your browser and can be installed on your phone or computer, so there&apos;s
          nothing to download from a store. If you can&apos;t reach Velo from your region, let us
          know.
        </p>
      </Section>

      <Section id="language" title="Language and region">
        <p>
          Velo is currently available in English. More languages and regional features are on our
          wish list. Tell us what you&apos;d like to see.
        </p>
        <CtaLink href="/feedback">Share feedback</CtaLink>
      </Section>
    </InfoPage>
  );
}
