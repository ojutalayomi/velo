import type { ClientPostSchema } from "@/lib/types/type";

/**
 * A post the signed-in user deletes is removed from the screen at once, and the server never
 * echoes that back to the person who did it. Other open views of the same post (the profile
 * page's list and its post count, say) hear about it through these window events instead.
 */
const REMOVED = "velo:post-removed";
const RESTORED = "velo:post-restored";

export type PostRemoved = { postId: string; type?: ClientPostSchema["Type"] };

export function emitPostRemoved(detail: PostRemoved) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(REMOVED, { detail }));
}

/** The delete failed on the server, so the post is back. */
export function emitPostRestored(post: ClientPostSchema) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(RESTORED, { detail: post }));
}

export function onPostRemoved(handler: (detail: PostRemoved) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<PostRemoved>).detail);
  window.addEventListener(REMOVED, listener);
  return () => window.removeEventListener(REMOVED, listener);
}

export function onPostRestored(handler: (post: ClientPostSchema) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<ClientPostSchema>).detail);
  window.addEventListener(RESTORED, listener);
  return () => window.removeEventListener(RESTORED, listener);
}

/** What the profile's "posts" total counts: the user's own posts and quote posts. */
export const COUNTED_POST_TYPES: ReadonlySet<string> = new Set(["post", "quote"]);
export const countsAsPost = (type?: string) => !!type && COUNTED_POST_TYPES.has(type);
