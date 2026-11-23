import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

/**
 * Shown by the service worker when a page isn't available offline. Deliberately plain: no client
 * code, so it renders from the saved HTML alone.
 */
export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "1.5rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>You&apos;re offline</h1>
      <p style={{ maxWidth: "28rem", opacity: 0.75 }}>
        This page hasn&apos;t been saved for offline use yet. Chats and pages you&apos;ve already
        opened are still available, and the rest will load once you&apos;re back online.
      </p>
      {/* A plain link on purpose: a full page load goes through the service worker, and this page
          has no client JS for a client-side navigation. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/chats" style={{ textDecoration: "underline" }}>
        Go to your chats
      </a>
    </main>
  );
}
