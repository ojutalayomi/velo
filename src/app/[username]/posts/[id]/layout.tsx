import type { Metadata } from "next";

import { getPost } from "@/lib/getStatus";
import { PostSchema } from "@/lib/types/type";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
const siteName = "Velo";
const defaultImage = baseUrl + "/velo11.png";

type Props = {
  params: Promise<{ id: string }>
}

function formatEngagementMetrics(post: PostSchema): string {
  const metrics: string[] = [];
  
  if (post.NoOfLikes > 0) {
    metrics.push(`${post.NoOfLikes} ${post.NoOfLikes === 1 ? "like" : "likes"}`);
  }
  if (post.NoOfComment > 0) {
    metrics.push(`${post.NoOfComment} ${post.NoOfComment === 1 ? "comment" : "comments"}`);
  }
  if (post.NoOfShares > 0) {
    metrics.push(`${post.NoOfShares} ${post.NoOfShares === 1 ? "share" : "shares"}`);
  }
  if (post.NoOfBookmarks > 0) {
    metrics.push(`${post.NoOfBookmarks} ${post.NoOfBookmarks === 1 ? "bookmark" : "bookmarks"}`);
  }
  
  return metrics.length > 0 ? ` • ${metrics.join(", ")}` : "";
}

function generatePostDescription(post: PostSchema): string {
  const maxLength = 160;
  const authorName = post.NameOfPoster || post.Username || "Someone";
  const engagementMetrics = formatEngagementMetrics(post);
  const availableLength = maxLength - engagementMetrics.length;
  
  // If there's a caption, use it (truncated if needed)
  if (post.Caption && post.Caption.trim()) {
    const caption = post.Caption.trim();
    const captionWithAuthor = `${authorName}: ${caption}`;
    
    if (captionWithAuthor.length <= availableLength) {
      return captionWithAuthor + engagementMetrics;
    }
    
    // Truncate at word boundary if possible
    const truncated = caption.substring(0, availableLength - authorName.length - 4);
    const lastSpace = truncated.lastIndexOf(" ");
    const finalCaption = lastSpace > 0 
      ? truncated.substring(0, lastSpace) + "..."
      : truncated + "...";
    return `${authorName}: ${finalCaption}${engagementMetrics}`;
  }
  
  // Handle different post types when there's no caption
  let baseDescription = "";
  if (post.Type === "quote") {
    baseDescription = `${authorName} shared a quote on ${siteName}`;
  } else if (post.Type === "repost") {
    baseDescription = `${authorName} reposted on ${siteName}`;
  } else if (post.Type === "comment") {
    baseDescription = `${authorName} commented on ${siteName}`;
  } else if (post.Image && post.Image.length > 0) {
    baseDescription = `${authorName} shared ${post.Image.length} ${post.Image.length === 1 ? "media" : "media items"} on ${siteName}`;
  } else {
    baseDescription = `Post by ${authorName} on ${siteName}`;
  }
  
  // Add engagement metrics if they fit
  if (baseDescription.length + engagementMetrics.length <= maxLength) {
    return baseDescription + engagementMetrics;
  }
  
  // If metrics don't fit, truncate base description to make room
  const truncatedBase = baseDescription.substring(0, maxLength - engagementMetrics.length - 3) + "...";
  return truncatedBase + engagementMetrics;
}
 
export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  const { id } = await params;

  try {
    const post = (await getPost(id))?.post || null;

  if (!post) {
    throw new Error("Post not found");
  }

    const description = generatePostDescription(post);
    const title = `${post.NameOfPoster || post.Username || siteName} - ${siteName}`;
    const ogImage = post.Image && post.Image.length > 0 
      ? post.Image[0] 
      : post.DisplayPicture || defaultImage;

    return {
      title,
      description,
      openGraph: {
        images: [{ url: ogImage }],
        siteName,
        title,
        description,
      },
      twitter: {
        images: [{ url: ogImage }],
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch (e) {
    return {
      title: siteName,
      description: (e as Error).message,
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
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}