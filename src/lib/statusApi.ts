import type { StatusCreateInput, StatusGroup } from "@/lib/types/status";

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
