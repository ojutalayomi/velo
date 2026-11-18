import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Callout, InfoPage, Prose, Toc } from "@/components/info/InfoPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Velo",
  description: "How Velo collects, uses and protects your information.",
};

const UPDATED = "18 November 2026";

const TOC = [
  { id: "collect", label: "Information we collect" },
  { id: "use", label: "How we use it" },
  { id: "share", label: "Sharing" },
  { id: "storage", label: "Storage and security" },
  { id: "choices", label: "Your choices and rights" },
  { id: "cookies", label: "Cookies and local storage" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPage() {
  return (
    <InfoPage
      current="/privacy"
      eyebrow="Legal"
      icon={<ShieldCheck className="size-4" />}
      title="Privacy Policy"
      intro={`Last updated ${UPDATED}. This explains what Velo collects, why, and the controls you have.`}
    >
      <Toc items={TOC} />
      <Prose>
        <h2 id="collect">1. Information we collect</h2>
        <ul>
          <li>
            <strong>Account details:</strong> name, username, email, password (stored hashed), and
            optional profile information such as bio, photo and phone number.
          </li>
          <li>
            <strong>Sign-in data:</strong> if you use Google, we receive your basic profile and
            email. If you use a passkey, we store the public key only. Your biometric data never
            leaves your device.
          </li>
          <li>
            <strong>Content you create:</strong> posts, comments, messages, reactions, and files,
            images or video you upload.
          </li>
          <li>
            <strong>Activity:</strong> who you follow, likes, bookmarks, blocks, and notification
            preferences.
          </li>
          <li>
            <strong>Device and usage data:</strong> browser, device type, approximate region,
            performance metrics and IP address (used for security and rate limiting).
          </li>
          <li>
            <strong>Push notification tokens</strong> if you enable notifications.
          </li>
        </ul>

        <h2 id="use">2. How we use it</h2>
        <ul>
          <li>To provide Velo: show your feed, deliver messages and connect calls.</li>
          <li>To keep Velo safe: prevent abuse, spam and unauthorised access.</li>
          <li>
            To send notifications and service emails you&apos;ve asked for or that are needed, such
            as email verification and password resets.
          </li>
          <li>To improve speed and reliability, and to understand how features are used.</li>
          <li>To comply with the law.</li>
        </ul>
        <p>We don&apos;t sell your personal information.</p>

        <h2 id="share">3. Sharing</h2>
        <ul>
          <li>
            <strong>Other users:</strong> your profile and public posts are visible to others as
            your settings allow. Messages are visible to the people in that conversation.
          </li>
          <li>
            <strong>Service providers</strong> that host and run Velo, such as cloud hosting,
            database, file storage, email delivery and analytics. They may process data only on our
            behalf.
          </li>
          <li>
            <strong>Legal reasons:</strong> when required by law or to protect people&apos;s safety
            and our rights.
          </li>
        </ul>

        <h2 id="storage">4. Storage and security</h2>
        <p>
          We use industry-standard measures including encrypted connections, hashed passwords,
          passkey support and rate limiting. No system is perfectly secure, so please use a strong,
          unique password or a passkey. We keep your data while your account is active and delete or
          anonymise it within a reasonable time after you delete your account, unless the law
          requires us to keep it.
        </p>

        <h2 id="choices">5. Your choices and rights</h2>
        <ul>
          <li>
            Edit your profile and privacy options in{" "}
            <Link href="/account/personal-info">Settings</Link>.
          </li>
          <li>Control who can contact you, and block accounts you don&apos;t want to hear from.</li>
          <li>Turn notifications on or off at any time in your browser or device.</li>
          <li>
            Delete your account from{" "}
            <Link href="/account/privacy-security">Privacy &amp; Security</Link>.
          </li>
          <li>
            Depending on where you live (including under the Nigeria Data Protection Act), you may
            have the right to access, correct, port or erase your data, and to object to certain
            processing. Contact us to exercise these rights.
          </li>
        </ul>

        <h2 id="cookies">6. Cookies and local storage</h2>
        <p>
          We use essential cookies and browser storage to keep you signed in, remember your theme
          and preferences, and keep Velo working offline. We use limited performance analytics to
          measure page speed.
        </p>

        <h2 id="children">7. Children</h2>
        <p>
          Velo isn&apos;t intended for anyone under 13 (or the minimum age in your country). If you
          believe a child has given us personal information, contact us and we&apos;ll delete it.
        </p>

        <h2 id="changes">8. Changes</h2>
        <p>
          We may update this policy. If the changes are significant we&apos;ll let you know in the
          app or by email, and update the date above.
        </p>

        <h2 id="contact">9. Contact</h2>
        <p>
          Questions or requests? Reach us through the <Link href="/feedback">feedback form</Link> or
          visit <Link href="/help-support">Help</Link>.
        </p>
      </Prose>
      <div className="mt-8">
        <Callout tone="warn">
          This policy is a plain-language draft. Have it reviewed by a qualified lawyer before
          relying on it.
        </Callout>
      </div>
    </InfoPage>
  );
}
