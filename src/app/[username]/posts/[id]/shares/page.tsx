import SharesClient from "./SharesClient";

type ShareTab = "reposts" | "quotes";

function normalizeTab(tab: string | string[] | undefined): ShareTab {
  const value = Array.isArray(tab) ? tab[0] : tab;
  return value === "quotes" ? "quotes" : "reposts";
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
