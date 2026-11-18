import type { PostSchema } from "@/lib/types/type";

/** Payload for `socket.emit("reactToPost", …)` — matches `PostCard` / socket server contract. */
export type ReactToPostEmit = {
  type: "like" | "unlike" | "bookmark" | "unbookmark";
  key: "NoOfLikes" | "NoOfBookmarks";
  value: "inc" | "dec";
  postId: string;
};

export function togglePostLike(post: PostSchema): { next: PostSchema; emit: ReactToPostEmit } {
  if (post.Liked) {
    return {
      next: { ...post, NoOfLikes: Math.max(0, post.NoOfLikes - 1), Liked: false },
      emit: { type: "unlike", key: "NoOfLikes", value: "dec", postId: post.PostID },
    };
  }
  return {
    next: { ...post, NoOfLikes: post.NoOfLikes + 1, Liked: true },
    emit: { type: "like", key: "NoOfLikes", value: "inc", postId: post.PostID },
  };
}

export function togglePostBookmark(post: PostSchema): { next: PostSchema; emit: ReactToPostEmit } {
  if (post.Bookmarked) {
    return {
      next: { ...post, NoOfBookmarks: Math.max(0, post.NoOfBookmarks - 1), Bookmarked: false },
      emit: { type: "unbookmark", key: "NoOfBookmarks", value: "dec", postId: post.PostID },
    };
  }
  return {
    next: { ...post, NoOfBookmarks: post.NoOfBookmarks + 1, Bookmarked: true },
    emit: { type: "bookmark", key: "NoOfBookmarks", value: "inc", postId: post.PostID },
  };
}

export function postPermalinkPath(post: Pick<PostSchema, "Username" | "PostID">): string {
  return `/${encodeURIComponent(post.Username)}/posts/${encodeURIComponent(post.PostID)}`;
}

export function postPublicUrl(post: Pick<PostSchema, "Username" | "PostID">): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${postPermalinkPath(post)}`;
}

/** Native share sheet, or copy link — for guests / when Share menu is unavailable. */
export async function sharePostLink(
  post: Pick<PostSchema, "Username" | "PostID" | "Caption">
): Promise<void> {
  const url = postPublicUrl(post);
  if (!url) return;
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({
        url,
        title: `@${post.Username}`,
        text: post.Caption ? String(post.Caption).slice(0, 120) : undefined,
      });
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
  } catch {
    /* dismissed share sheet */
  }
}
