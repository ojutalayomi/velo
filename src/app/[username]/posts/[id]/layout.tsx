import type { Metadata } from "next";

import { getPost } from "@/lib/getStatus";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
const siteName = "Velo";
const defaultImage = baseUrl + "/velo11.png";

export async function generateMetadata(props: any): Promise<Metadata> {
  const params = props?.params || {};
  const id = params.id;
  let post: any;

  getPost(id)
  .then((data) => {
    post = data.post;
  })
  .catch();

  if (!post) {
    return {
      title: siteName,
      description: "Post not found",
      openGraph: {
        images: [{ url: defaultImage }],
        siteName,
        title: siteName,
        description: "Post not found",
      },
      twitter: {
        images: [{ url: defaultImage }],
        card: "summary_large_image",
        title: siteName,
        description: "Post not found",
      },
    };
  }

  return {
    title: `${post.Username ?? siteName} - ${siteName}`,
    description: post.Caption ?? "",
    openGraph: {
      images: [{ url: post.DisplayPicture || defaultImage }],
      siteName,
      title: `${post.Username ?? siteName} - ${siteName}`,
      description: post.Caption ?? "",
    },
    twitter: {
      images: [{ url: post.DisplayPicture || defaultImage }],
      card: "summary_large_image",
      title: `${post.Username ?? siteName} - ${siteName}`,
      description: post.Caption ?? "",
    },
  };
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}