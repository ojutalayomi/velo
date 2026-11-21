import type { PollData } from "@/lib/polls";
import type { PostLocation } from "@/lib/types/type";

export const POST_DRAFTS_KEY = "velo:post-drafts:v1";
export const MAX_POST_DRAFTS = 50;

export interface PostDraft {
  id: string;
  /** "post", or `${type}:${parentPostId}` for comments and quotes. */
  scope: string;
  text: string;
  visibility: string;
  poll: PollData | null;
  location: PostLocation | null;
  updatedAt: number;
}

export type PostDraftContent = Pick<PostDraft, "text" | "visibility" | "poll" | "location">;

export const EMPTY_DRAFTS: PostDraft[] = [];

export function isDraftEmpty(content: Pick<PostDraft, "text" | "poll" | "location">) {
  return !content.text.trim() && !content.poll && !content.location;
}

/** Parses stored drafts defensively: anything malformed is dropped, newest first. */
export function parseDrafts(raw: string | null): PostDraft[] {
  if (!raw) return EMPTY_DRAFTS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_DRAFTS;
    const drafts = parsed.filter(
      (d): d is PostDraft =>
        !!d &&
        typeof d.id === "string" &&
        typeof d.scope === "string" &&
        typeof d.text === "string" &&
        typeof d.updatedAt === "number"
    );
    return drafts.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return EMPTY_DRAFTS;
  }
}

/** Inserts or updates a draft; returns the new list (capped, newest first). */
export function upsertDraft(
  drafts: PostDraft[],
  id: string,
  scope: string,
  content: PostDraftContent,
  now = Date.now()
): PostDraft[] {
  const next: PostDraft = { id, scope, ...content, updatedAt: now };
  return [next, ...drafts.filter((d) => d.id !== id)].slice(0, MAX_POST_DRAFTS);
}

export function removeDraft(drafts: PostDraft[], id: string): PostDraft[] {
  return drafts.filter((d) => d.id !== id);
}

export function draftChanged(existing: PostDraft | undefined, content: PostDraftContent) {
  return (
    !existing ||
    existing.text !== content.text ||
    existing.visibility !== content.visibility ||
    JSON.stringify(existing.poll) !== JSON.stringify(content.poll) ||
    JSON.stringify(existing.location) !== JSON.stringify(content.location)
  );
}

export function draftPreview(draft: Pick<PostDraft, "text" | "poll" | "location">) {
  const text = draft.text.trim();
  if (text) return text.length > 140 ? `${text.slice(0, 137)}…` : text;
  if (draft.poll) return `📊 ${draft.poll.question}`;
  if (draft.location) return `📍 ${draft.location.name}`;
  return "Empty draft";
}
