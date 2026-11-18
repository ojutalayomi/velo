export type SubmitFollowParams = {
  followerId: string;
  followedId: string;
  follow: boolean;
  /** ISO timestamp; defaults to `new Date().toISOString()` */
  time?: string;
};

/**
 * POST /api/follow — shared by profile page, PostCard, etc.
 * Returns the raw `Response` so callers can branch on status or read the body.
 */
export async function submitFollowUpdate(params: SubmitFollowParams): Promise<Response> {
  const { followerId, followedId, follow, time = new Date().toISOString() } = params;
  return fetch(`/api/follow`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      followerId,
      followedId,
      time,
      follow,
    }),
  });
}
