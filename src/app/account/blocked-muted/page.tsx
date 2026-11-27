"use client";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";

import { SettingsHeader } from "@/components/settings/SettingsUI";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Statuser } from "@/components/VerificationComponent";
import type { RelatedUser } from "@/lib/relatedUsers";
import { fetchRelatedUsers, type RelationKind } from "@/lib/relatedUsersApi";
import { toast } from "@/lib/toast";
import { setUserBlocked, setUserMuted } from "@/lib/userRelations";
import { cn } from "@/lib/utils";

const TABS: { kind: RelationKind; label: string; action: string; empty: string; hint: string }[] = [
  {
    kind: "muted",
    label: "Muted",
    action: "Unmute",
    empty: "You haven't muted anyone.",
    hint: "Muted accounts' posts stay out of your feeds. They can still see and message you.",
  },
  {
    kind: "blocked",
    label: "Blocked",
    action: "Unblock",
    empty: "You haven't blocked anyone.",
    hint: "Blocked accounts' posts stay out of your feeds.",
  },
];

type ListState = { users: RelatedUser[]; loading: boolean; error: string | null };
const EMPTY: ListState = { users: [], loading: true, error: null };

export default function BlockedMutedPage() {
  const [tab, setTab] = useState<RelationKind>("muted");
  const [lists, setLists] = useState<Record<RelationKind, ListState>>({ muted: EMPTY, blocked: EMPTY });
  const [busy, setBusy] = useState<string | null>(null);

  // Both lists start out "loading", so the first fetch only sets state once it has an answer.
  const fetchList = useCallback(async (kind: RelationKind) => {
    try {
      const users = await fetchRelatedUsers(kind);
      setLists((current) => ({ ...current, [kind]: { users, loading: false, error: null } }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't load this list. Try again.";
      setLists((current) => ({ ...current, [kind]: { users: [], loading: false, error: message } }));
    }
  }, []);

  const reload = useCallback(
    (kind: RelationKind) => {
      setLists((current) => ({ ...current, [kind]: { ...current[kind], loading: true, error: null } }));
      void fetchList(kind);
    },
    [fetchList]
  );

  useEffect(() => {
    let alive = true;
    for (const kind of ["muted", "blocked"] as const) {
      fetchRelatedUsers(kind)
        .then((users) => alive && setLists((current) => ({ ...current, [kind]: { users, loading: false, error: null } })))
        .catch((error) => {
          const message = error instanceof Error ? error.message : "Couldn't load this list. Try again.";
          if (alive) setLists((current) => ({ ...current, [kind]: { users: [], loading: false, error: message } }));
        });
    }
    return () => {
      alive = false;
    };
  }, []);

  const change = async (kind: RelationKind, user: RelatedUser, on: boolean) => {
    const apply = kind === "muted" ? setUserMuted : setUserBlocked;
    return apply(user._id, on);
  };

  const undo = async (kind: RelationKind, user: RelatedUser) => {
    if (busy) return;
    setBusy(user._id);
    const error = await change(kind, user, false);
    setBusy(null);
    if (error) {
      toast.error(error);
      return;
    }
    setLists((current) => ({
      ...current,
      [kind]: { ...current[kind], users: current[kind].users.filter((u) => u._id !== user._id) },
    }));
    toast(`${kind === "muted" ? "Unmuted" : "Unblocked"} @${user.username}`, {
      action: {
        label: "Undo",
        onClick: () => {
          void change(kind, user, true).then((undoError) => {
            if (undoError) toast.error(undoError);
            else reload(kind);
          });
        },
      },
    });
  };

  const current = TABS.find((t) => t.kind === tab)!;
  const state = lists[tab];

  return (
    <div className="max-h-screen w-full overflow-auto">
      <SettingsHeader title="Muted and blocked" backTo="/general" />
      <main className="mx-auto mb-20 max-w-2xl space-y-4 p-4 tablets:mb-6">
        <div role="tablist" aria-label="Muted or blocked" className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-zinc-800">
          {TABS.map((t) => (
            <button
              key={t.kind}
              type="button"
              role="tab"
              aria-selected={tab === t.kind}
              onClick={() => setTab(t.kind)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                tab === t.kind
                  ? "bg-white shadow-xs dark:bg-zinc-950"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              )}
            >
              {t.label}
              {!lists[t.kind].loading && !lists[t.kind].error && ` (${lists[t.kind].users.length})`}
            </button>
          ))}
        </div>

        <p className="px-1 text-sm text-gray-500 dark:text-gray-400">{current.hint}</p>

        <div role="tabpanel" aria-label={current.label}>
          {state.loading ? (
            <div className="space-y-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          ) : state.error ? (
            <div role="alert" className="rounded-2xl border p-4 text-sm dark:border-zinc-800">
              <p className="mb-3">{state.error}</p>
              <Button variant="outline" onClick={() => reload(tab)}>
                Try again
              </Button>
            </div>
          ) : state.users.length === 0 ? (
            <p className="rounded-2xl border p-6 text-center text-sm text-gray-500 dark:border-zinc-800 dark:text-gray-400">
              {current.empty}
            </p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
              {state.users.map((user) => (
                <li key={user._id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={`/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar className="size-11">
                      <AvatarImage src={user.displayPicture} alt="" />
                      <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 font-semibold">
                        <span className="truncate">{user.name}</span>
                        {user.verified && <Statuser className="size-4 shrink-0" />}
                      </p>
                      <p className="truncate text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                    </div>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy === user._id}
                    onClick={() => void undo(tab, user)}
                    aria-label={`${current.action} @${user.username}`}
                  >
                    {current.action}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
