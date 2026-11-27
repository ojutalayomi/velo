import type { RelatedUser } from "@/lib/relatedUsers";

export type RelationKind = "muted" | "blocked";

/** The signed-in user's muted or blocked accounts, newest first. Throws a readable message on failure. */
export async function fetchRelatedUsers(kind: RelationKind): Promise<RelatedUser[]> {
  const response = await fetch(`/api/${kind === "muted" ? "mutes" : "blocks"}?details=1`);
  if (response.status === 401) throw new Error("Sign in to see this list.");
  if (!response.ok) throw new Error("Couldn't load this list. Try again.");
  const body = (await response.json().catch(() => null)) as { users?: RelatedUser[] } | null;
  return body?.users ?? [];
}
