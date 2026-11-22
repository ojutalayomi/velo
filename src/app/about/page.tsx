import { MessageCircle, Phone, Radio, ShieldCheck, Users, Zap } from "lucide-react";
import type { Metadata } from "next";

import { CtaLink, FeatureCard, InfoPage, Section } from "@/components/info/InfoPage";

export const metadata: Metadata = {
  title: "About",
  description:
    "Velo is a modern social platform for sharing, connecting and chatting in real time. Built in Nigeria.",
};

export default function AboutPage() {
  return (
    <InfoPage
      current="/about"
      eyebrow="About Velo"
      title="Share it. Say it. Right now."
      intro="Velo is a social platform where posts, conversations and calls live in one place, and everything arrives the moment it happens."
    >
      <Section title="Why we built Velo">
        <p>
          Most of us juggle one app to post, another to message and a third to call. Velo brings
          them together so a post can turn into a conversation, and a conversation into a call,
          without leaving the app.
        </p>
        <p>
          We&apos;re building it in Nigeria, for people who want a fast, friendly and private place
          to stay close to the people and ideas they care about.
        </p>
      </Section>

      <Section title="What you can do">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard icon={<Radio className="size-5" />} title="Post and discover">
            Share text, photos and video, follow people, and explore what&apos;s trending.
          </FeatureCard>
          <FeatureCard icon={<MessageCircle className="size-5" />} title="Real-time chat">
            Direct messages and group chats with reactions, mentions and file sharing.
          </FeatureCard>
          <FeatureCard icon={<Phone className="size-5" />} title="Voice and video calls">
            Start a call straight from any conversation. No extra app needed.
          </FeatureCard>
          <FeatureCard icon={<Users className="size-5" />} title="Groups and invites">
            Create communities, manage members and invite friends with a simple link.
          </FeatureCard>
        </div>
      </Section>

      <Section title="What we care about">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard icon={<ShieldCheck className="size-5" />} title="Privacy and security">
            Passkey sign-in, blocking controls and clear settings for who sees what.
          </FeatureCard>
          <FeatureCard icon={<Zap className="size-5" />} title="Speed">
            An installable, app-like experience that stays quick on everyday connections.
          </FeatureCard>
        </div>
      </Section>

      <Section className="flex flex-wrap gap-3 pt-8">
        <CtaLink href="/accounts/signup">Join Velo</CtaLink>
        <CtaLink href="/feedback" variant="outline">
          Send us feedback
        </CtaLink>
      </Section>
    </InfoPage>
  );
}
