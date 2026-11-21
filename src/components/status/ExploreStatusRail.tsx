"use client";

import { CircleDashed } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { StatusAvatar, StatusViewer } from "@/components/status/StatusTray";
import { fetchExploreStatusGroups } from "@/lib/statusApi";
import type { StatusGroup } from "@/lib/types/status";

export function ExploreStatusRail() {
  const [groups, setGroups] = useState<StatusGroup[]>([]);
  const [viewerStart, setViewerStart] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchExploreStatusGroups()
      .then((data) => active && setGroups(data))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const markViewed = useCallback((statusId: string) => {
    setGroups((prev) =>
      prev.map((group) => {
        const statuses = group.statuses.map((s) => (s._id === statusId ? { ...s, viewed: true } : s));
        return { ...group, statuses, hasUnviewed: statuses.some((s) => !s.viewed) };
      })
    );
  }, []);

  if (groups.length === 0) return null;

  return (
    <section className="mb-4 mt-2">
      <h2 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        <CircleDashed size={16} className="text-brand" />
        Status updates
      </h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-1 pb-1">
        {groups.map((group, index) => (
          <button
            key={group.user._id}
            type="button"
            onClick={() => setViewerStart(index)}
            className="flex w-20 shrink-0 flex-col items-center gap-1 text-center"
          >
            <StatusAvatar group={group} />
            <span className="max-w-full truncate text-xs font-medium dark:text-slate-200">
              {group.user.username || group.user.name}
            </span>
          </button>
        ))}
      </div>
      {viewerStart !== null && (
        <StatusViewer
          groups={groups}
          initialGroupIndex={viewerStart}
          initialStatusIndex={Math.max(0, groups[viewerStart].statuses.findIndex((s) => !s.viewed))}
          onClose={() => setViewerStart(null)}
          onViewed={markViewed}
        />
      )}
    </section>
  );
}
