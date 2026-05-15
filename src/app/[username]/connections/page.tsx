import ConnectionsClient from "./ConnectionsClient";

type ConnectionTab = "followers" | "following";

function normalizeTab(tab: string | string[] | undefined): ConnectionTab {
  const value = Array.isArray(tab) ? tab[0] : tab;
  return value === "following" ? "following" : "followers";
}

export default async function ConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;

  return <ConnectionsClient username={username} initialTab={normalizeTab(tab)} />;
}
