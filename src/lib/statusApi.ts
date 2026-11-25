import type { StatusCreateInput, StatusGroup, StatusViewerDetail } from "@/lib/types/status";

async function parseStatusResponse(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || body?.error || "Status request failed");
  }
  return res.json();
}

export async function fetchStatusGroups(): Promise<StatusGroup[]> {
  const body = (await parseStatusResponse(
    await fetch("/api/statuses", {
      headers: { "Content-Type": "application/json" },
    })
  )) as { data?: StatusGroup[] };
  return Array.isArray(body.data) ? body.data : [];
}

export async function fetchExploreStatusGroups(): Promise<StatusGroup[]> {
  const body = (await parseStatusResponse(
    await fetch("/api/statuses?scope=explore", {
      headers: { "Content-Type": "application/json" },
    })
  )) as { data?: StatusGroup[] };
  return Array.isArray(body.data) ? body.data : [];
}

export async function createStatus(input: StatusCreateInput): Promise<StatusGroup[]> {
  const body = (await parseStatusResponse(
    await fetch("/api/statuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  )) as { data?: StatusGroup[] };
  return Array.isArray(body.data) ? body.data : [];
}

export async function deleteStatus(statusId: string): Promise<void> {
  await parseStatusResponse(
    await fetch(`/api/statuses/${statusId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
  );
}

export async function markStatusViewed(statusId: string): Promise<void> {
  await parseStatusResponse(
    await fetch(`/api/statuses/${statusId}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
  );
}

/** Like (`true`) or unlike (`false`) a status; resolves to the totals the server now has. */
export async function setStatusLiked(
  statusId: string,
  liked: boolean
): Promise<{ liked: boolean; likeCount: number }> {
  const body = (await parseStatusResponse(
    await fetch(`/api/statuses/${statusId}/like`, {
      method: liked ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
    })
  )) as { data: { liked: boolean; likeCount: number } };
  return body.data;
}

/** Who viewed one of your statuses, with names (owner only). */
export async function fetchStatusViewers(statusId: string): Promise<StatusViewerDetail[]> {
  const body = (await parseStatusResponse(
    await fetch(`/api/statuses/${statusId}/viewers`, {
      headers: { "Content-Type": "application/json" },
    })
  )) as { data?: StatusViewerDetail[] };
  return Array.isArray(body.data) ? body.data : [];
}

/** Reply to a status; the reply lands in your DM with its owner. */
export async function replyToStatus(
  statusId: string,
  content: string
): Promise<{ chatId: string; messageId: string }> {
  const body = (await parseStatusResponse(
    await fetch(`/api/statuses/${statusId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
  )) as { data: { chatId: string; messageId: string } };
  return body.data;
}
