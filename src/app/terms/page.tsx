import { ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Callout, InfoPage, Prose, Toc } from "@/components/info/InfoPage";

export const metadata: Metadata = {
  title: "Terms of Service | Velo",
  description: "The rules for using Velo.",
};

const UPDATED = "18 November 2026";

const TOC = [
  { id: "accept", label: "Accepting these terms" },
  { id: "account", label: "Your account" },
  { id: "content", label: "Your content" },
  { id: "conduct", label: "Acceptable use" },
  { id: "enforce", label: "Enforcement" },
  { id: "ip", label: "Our rights" },
  { id: "thirdparty", label: "Third-party services" },
  { id: "disclaimer", label: "Disclaimers and liability" },
  { id: "termination", label: "Ending your use" },
  { id: "law", label: "Governing law" },
  { id: "changes", label: "Changes and contact" },
];

export default function TermsPage() {
  return (
    <InfoPage
      current="/terms"
      eyebrow="Legal"
      icon={<ScrollText className="size-4" />}
      title="Terms of Service"
      intro={`Last updated ${UPDATED}. By using Velo you agree to these terms, so please read them.`}
    >
      <Toc items={TOC} />
      <Prose>
        <h2 id="accept">1. Accepting these terms</h2>
        <p>
          By creating an account or using Velo you agree to these Terms and to our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t
          use Velo. You must be at least 13 years old (or the minimum age where you live).
        </p>

        <h2 id="account">2. Your account</h2>
        <ul>
          <li>Give accurate information and keep your sign-in details secure.</li>
          <li>You&apos;re responsible for activity on your account.</li>
          <li>Tell us right away if you think your account has been compromised.</li>
        </ul>

        <h2 id="content">3. Your content</h2>
        <p>
          You own what you post. By posting, you give Velo a non-exclusive, worldwide, royalty-free
          licence to host, store, display and distribute your content as needed to run and improve
          the service (for example, showing your post to your followers). This licence ends when you
          delete the content or your account, except where it has been shared by others or we must
          keep it by law. You&apos;re responsible for your content and confirm you have the right to
          share it.
        </p>

        <h2 id="conduct">4. Acceptable use</h2>
        <p>Don&apos;t use Velo to:</p>
        <ul>
          <li>
            Harass, threaten, impersonate or abuse others, or share hateful or violent content.
          </li>
          <li>
            Post illegal content, including child sexual abuse material, or content that infringes
            others&apos; rights.
          </li>
          <li>Spam, scam, phish or spread malware.</li>
          <li>
            Access others&apos; accounts, scrape at scale, or interfere with or bypass the
            service&apos;s security.
          </li>
          <li>Use Velo in a way that breaks the law.</li>
        </ul>

        <h2 id="enforce">5. Enforcement</h2>
        <p>
          We may remove content, limit features or suspend or close accounts that break these terms
          or put others at risk. Where practical we&apos;ll tell you why. You can report content or
          accounts in the app.
        </p>

        <h2 id="ip">6. Our rights</h2>
        <p>
          Velo, its name, logo, design and software belong to us or our licensors. These terms
          don&apos;t give you any right to use them except to use the service as intended.
        </p>

        <h2 id="thirdparty">7. Third-party services</h2>
        <p>
          Velo may link to or integrate with third-party services (such as Google sign-in). Their
          own terms and privacy policies apply to your use of them.
        </p>

        <h2 id="disclaimer">8. Disclaimers and liability</h2>
        <p>
          Velo is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We don&apos;t promise
          it will always be uninterrupted or error-free. To the fullest extent permitted by law,
          Velo isn&apos;t liable for indirect or consequential losses, or for content posted by
          users. Nothing in these terms limits liability that can&apos;t be limited by law.
        </p>

        <h2 id="termination">9. Ending your use</h2>
        <p>
          You can stop using Velo or delete your account at any time from{" "}
          <Link href="/account/privacy-security">Privacy &amp; Security</Link>. Sections that by
          their nature should survive (such as 3, 6 and 8) will continue after termination.
        </p>

        <h2 id="law">10. Governing law</h2>
        <p>
          These terms are governed by the laws of the Federal Republic of Nigeria, and disputes will
          be handled by the courts there, unless your local law says otherwise.
        </p>

        <h2 id="changes">11. Changes and contact</h2>
        <p>
          We may update these terms. If changes are material we&apos;ll notify you, and continued
          use means you accept the new terms. Questions? Use the{" "}
          <Link href="/feedback">feedback form</Link>.
        </p>
      </Prose>
      <div className="mt-8">
        <Callout tone="warn">
          These terms are a plain-language draft. Have them reviewed by a qualified lawyer before
          relying on them.
        </Callout>
      </div>
    </InfoPage>
  );
}
