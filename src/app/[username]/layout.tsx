// profile/layout.tsx
import { Metadata } from "next";

import { getUser } from "./action";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
const defaultDescription =
  "Velo is a modern social platform for sharing, connecting, and discovering new content.";
const defaultTitle = "Velo App";
const siteName = "Velo";
const defaultImage = baseUrl + "/velo11.png";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const user = await getUser(params.username);

  const title = `${user.name || defaultTitle} - ${defaultTitle}`;
  const description = user.bio || defaultDescription;
  const image = user.displayPicture || defaultImage;

  return {
    title,
    description,
    openGraph: {
      images: [{ url: image }],
      siteName,
      title,
      description,
      url: baseUrl,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      images: [{ url: image }],
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
