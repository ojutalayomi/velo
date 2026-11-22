import type { Metadata } from "next";

import SharesClient from "./SharesClient";

type ShareTab = "reposts" | "quotes";

function normalizeTab(tab: string | string[] | undefined): ShareTab {
  const value = Array.isArray(tab) ? tab[0] : tab;
  return value === "quotes" ? "quotes" : "reposts";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}): Promise<Metadata> {
  const { username } = await params;
  const { tab } = await searchParams;
  const handle = `@${decodeURIComponent(username).replace(/^@/, "")}`;
  const quotes = normalizeTab(tab) === "quotes";
  return {
    title: quotes ? `Quotes of ${handle}'s post` : `Reposts of ${handle}'s post`,
    description: quotes
      ? `See who quoted ${handle}'s post on Velo.`
      : `See who reposted ${handle}'s post on Velo.`,
  };
}

export default async function PostSharesPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { username, id } = await params;
  const { tab } = await searchParams;

  return <SharesClient username={username} postId={id} initialTab={normalizeTab(tab)} />;
}
