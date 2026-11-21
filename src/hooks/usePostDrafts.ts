"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import {
  EMPTY_DRAFTS,
  parseDrafts,
  POST_DRAFTS_KEY,
  PostDraft,
  removeDraft,
  upsertDraft,
  type PostDraftContent,
} from "@/lib/postDrafts";

const EVENT = "velo:post-drafts-change";

let cachedRaw: string | null | undefined;
let cachedDrafts: PostDraft[] = EMPTY_DRAFTS;

function readRaw() {
  try {
    return localStorage.getItem(POST_DRAFTS_KEY);
  } catch {
    return null;
  }
}

/** Stable reference while the stored string is unchanged, as useSyncExternalStore requires. */
function getSnapshot(): PostDraft[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedDrafts = parseDrafts(raw);
  }
  return cachedDrafts;
}

function write(drafts: PostDraft[]) {
  try {
    if (drafts.length) localStorage.setItem(POST_DRAFTS_KEY, JSON.stringify(drafts));
    else localStorage.removeItem(POST_DRAFTS_KEY);
  } catch {
    // storage unavailable or full: drafts are best-effort
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Saved post drafts for one scope (post, or a comment/quote on a given post), kept in localStorage. */
export function usePostDrafts(scope: string) {
  const all = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_DRAFTS);
  const drafts = useMemo(() => all.filter((d) => d.scope === scope), [all, scope]);

  const save = useCallback(
    (id: string, content: PostDraftContent) => write(upsertDraft(getSnapshot(), id, scope, content)),
    [scope]
  );
  const remove = useCallback((id: string) => write(removeDraft(getSnapshot(), id)), []);
  const clearScope = useCallback(
    () => write(getSnapshot().filter((d) => d.scope !== scope)),
    [scope]
  );

  return { drafts, save, remove, clearScope };
}
