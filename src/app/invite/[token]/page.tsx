import type { Metadata } from "next";

import InviteJoin from "./clientComps";

export const metadata: Metadata = {
  title: "Join a group",
  robots: { index: false, follow: false },
  description: "Accept a Velo group invite",
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteJoin token={token} />;
}
