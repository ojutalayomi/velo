"use client";

import { Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Statuser } from "@/components/VerificationComponent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { fetchUsersSearchPage } from "@/lib/getStatus";
import type { UserData } from "@/lib/types/user";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "velo_explore_recent_searches";
const MAX_RECENTS = 10;
const DEBOUNCE_MS = 300;

type RecentQuery = { id: string; kind: "query"; text: string };
type RecentUser = {
  id: string;
  kind: "user";
  userId: string;
  username: string;
  name: string;
  displayPicture: string;
  verified: boolean;
};
type RecentItem = RecentQuery | RecentUser;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadRecents(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as RecentItem[];
  } catch {
    return [];
  }
}

function saveRecentsToStorage(items: RecentItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)));
  } catch {
    /* ignore */
  }
}

function cleanQuery(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9\s]/g, "").trim();
}

export type ExploreSearchPanelProps = {
  variant: "explore" | "sidebar";
  className?: string;
};

export function ExploreSearchPanel({ variant, className }: ExploreSearchPanelProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [suggestions, setSuggestions] = useState<UserData[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    setRecents(loadRecents());
  }, []);

  const addRecentQuery = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    setRecents((prev) => {
      const withoutDup = prev.filter(
        (r) => !(r.kind === "query" && r.text.toLowerCase() === t.toLowerCase())
      );
      const item: RecentQuery = { id: newId(), kind: "query", text: t };
      const next = [item, ...withoutDup].slice(0, MAX_RECENTS);
      saveRecentsToStorage(next);
      return next;
    });
  }, []);

  const addRecentUser = useCallback((user: UserData) => {
    const uid = String(user._id);
    setRecents((prev) => {
      const withoutDup = prev.filter((r) => !(r.kind === "user" && r.userId === uid));
      const item: RecentUser = {
        id: newId(),
        kind: "user",
        userId: uid,
        username: user.username,
        name: user.name || user.username,
        displayPicture: user.displayPicture || "",
        verified: Boolean(user.verified),
      };
      const next = [item, ...withoutDup].slice(0, MAX_RECENTS);
      saveRecentsToStorage(next);
      return next;
    });
  }, []);

  const removeRecent = useCallback((id: string) => {
    setRecents((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveRecentsToStorage(next);
      return next;
    });
  }, []);

  const clearAllRecents = useCallback(() => {
    setRecents(() => {
      saveRecentsToStorage([]);
      return [];
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    const cleaned = cleanQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!open || cleaned.length < 1) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    setSuggestionsLoading(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const page = await fetchUsersSearchPage(cleaned, 0, 15);
          setSuggestions((page.data as unknown as UserData[]) ?? []);
        } catch {
          setSuggestions([]);
        } finally {
          setSuggestionsLoading(false);
        }
      })();
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const goSearch = useCallback(
    (q: string) => {
      const t = q.trim();
      if (!t) return;
      addRecentQuery(t);
      router.push(`/search?q=${encodeURIComponent(t)}`);
      setOpen(false);
      setQuery("");
    },
    [addRecentQuery, router]
  );

  const openProfileFromSuggestion = useCallback(
    (user: UserData) => {
      addRecentUser(user);
      router.push(`/${user.username}`);
      setOpen(false);
      setQuery("");
    },
    [addRecentUser, router]
  );

  const openRecentProfile = useCallback((item: RecentUser) => {
    router.push(`/${item.username}`);
    setOpen(false);
    setQuery("");
  }, [router]);

  const showPeople = cleanQuery(query).length >= 1;

  const inputRing = open
    ? "border-[#1D9BF0] ring-2 ring-[#1D9BF0]/25 dark:ring-[#1D9BF0]/30"
    : "border-transparent focus-visible:border-[#1D9BF0] focus-visible:ring-2 focus-visible:ring-[#1D9BF0]/25";

  const panel = open && (
    <div
      id={listId}
      role="listbox"
      className={cn(
        "absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(70vh,420px)] overflow-auto rounded-2xl border border-zinc-700/80 bg-neutral-950 py-2 text-zinc-100 shadow-xl dark:bg-neutral-950",
        "ring-1 ring-black/20"
      )}
    >
      <div className="flex items-center justify-between px-3 pb-2 pt-1">
        <span className="text-sm font-semibold text-zinc-50">Recent</span>
        {recents.length > 0 ? (
          <button
            type="button"
            className="text-sm font-medium text-[#1D9BF0] hover:underline"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => clearAllRecents()}
          >
            Clear all
          </button>
        ) : null}
      </div>

      {recents.length === 0 ? (
        <p className="px-3 pb-2 text-xs text-zinc-500">No recent searches yet.</p>
      ) : (
        <ul className="border-b border-zinc-800 pb-2">
          {recents.map((item) => (
            <li key={item.id}>
              {item.kind === "query" ? (
                <div className="flex items-center gap-2 px-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-zinc-800/90"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goSearch(item.text)}
                  >
                    <Search className="size-4 shrink-0 text-zinc-500" aria-hidden />
                    <span className="truncate text-sm text-zinc-100">{item.text}</span>
                  </button>
                  <button
                    type="button"
                    className="shrink-0 rounded-full p-1.5 text-[#1D9BF0] hover:bg-zinc-800"
                    aria-label="Remove from recent"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => removeRecent(item.id)}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-zinc-800/90"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => openRecentProfile(item)}
                  >
                    <Avatar className="size-9 shrink-0">
                      <AvatarImage src={item.displayPicture} alt="" />
                      <AvatarFallback className="text-xs">
                        {item.username?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1">
                        <span className="truncate font-semibold text-zinc-50">{item.name}</span>
                        {item.verified ? <Statuser className="size-4 shrink-0" /> : null}
                      </span>
                      <span className="block truncate text-sm text-zinc-500">@{item.username}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="shrink-0 rounded-full p-1.5 text-[#1D9BF0] hover:bg-zinc-800"
                    aria-label="Remove from recent"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => removeRecent(item.id)}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {showPeople ? (
        <div className="pt-2">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            People
          </p>
          {suggestionsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-6 animate-spin text-zinc-500" />
            </div>
          ) : suggestions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500">No matching people.</p>
          ) : (
            <ul>
              {suggestions.map((user) => (
                <li key={String(user._id)}>
                  <div className="flex items-center gap-2 px-2">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-zinc-800/90"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => openProfileFromSuggestion(user)}
                    >
                      <Avatar className="size-9 shrink-0">
                        <AvatarImage src={user.displayPicture} alt="" />
                        <AvatarFallback className="text-xs">
                          {user.username?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1">
                          <span className="truncate font-semibold text-zinc-50">
                            {user.name || user.username}
                          </span>
                          {user.verified ? <Statuser className="size-4 shrink-0" /> : null}
                        </span>
                        <span className="block truncate text-sm text-zinc-500">@{user.username}</span>
                      </span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {variant === "explore" && open ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 dark:bg-black/50"
          aria-hidden
          onMouseDown={() => setOpen(false)}
        />
      ) : null}

      <div ref={rootRef} className={cn("relative z-50", className)}>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-gray-400 dark:text-zinc-500"
            aria-hidden
          />
          <Input
            type="text"
            placeholder="Search"
            value={query}
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                goSearch(query);
              }
            }}
            className={cn(
              "w-full rounded-full border-2 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition-colors",
              "dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500",
              "placeholder:text-gray-400",
              inputRing
            )}
          />
        </div>
        {panel}
      </div>
    </>
  );
}
