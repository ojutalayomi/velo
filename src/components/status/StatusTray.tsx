"use client";

import { Loader2, Plus } from "lucide-react";
import React, { useState } from "react";
import { useSelector } from "react-redux";

import { useUser } from "@/app/providers/UserProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { StatusGroup } from "@/lib/types/status";
import { RootState } from "@/redux/store";

import { StatusComposer } from "./StatusComposer";
import { StatusViewer } from "./StatusViewer";

export { StatusViewer };

const StatusTray = () => {
  const { userdata } = useUser();
  const { groups, loading } = useSelector((state: RootState) => state.status);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerStart, setViewerStart] = useState<{ groupIndex: number; statusIndex: number } | null>(
    null
  );

  const myGroup = groups.find((group) => group.user._id === userdata._id);
  const otherGroups = groups.filter((group) => group.user._id !== userdata._id);
  const visibleGroups = myGroup ? [myGroup, ...otherGroups] : otherGroups;

  if (loading && groups.length === 0) {
    return (
      <div className="flex items-center gap-2 border-b border-border bg-gray-50 px-4 py-3 text-sm text-muted-foreground dark:bg-zinc-900">
        <Loader2 className="size-4 animate-spin" />
        Loading statuses
      </div>
    );
  }
  

  if (!userdata._id) return <></>

  return (
    <section className="border-b border-border bg-gray-50 p-3 dark:bg-zinc-900">
      <div className="flex gap-3 overflow-x-auto p-1">
        <button
          type="button"
          onClick={() => (myGroup ? setViewerStart({ groupIndex: 0, statusIndex: 0 }) : setComposerOpen(true))}
          className="flex w-20 shrink-0 flex-col items-center gap-1 text-center"
        >
          <div className="relative">
            <StatusAvatar group={myGroup} fallback={userdata.firstname || userdata.username || "V"} />
            <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-gray-50 bg-brand text-white dark:border-zinc-900" onClick={(e) => { e.stopPropagation(); setComposerOpen(true); }}>
              <Plus className="size-3.5" />
            </span>
          </div>
          <span className="max-w-full truncate text-xs font-medium dark:text-slate-200">
            My status
          </span>
        </button>

        {otherGroups.map((group, index) => (
          <button
            key={group.user._id}
            type="button"
            onClick={() =>
              setViewerStart({
                groupIndex: myGroup ? index + 1 : index,
                statusIndex: Math.max(
                  0,
                  group.statuses.findIndex((status) => !status.viewed)
                ),
              })
            }
            className="flex w-20 shrink-0 flex-col items-center gap-1 text-center"
          >
            <StatusAvatar group={group} />
            <span className="max-w-full truncate text-xs font-medium dark:text-slate-200">
              {group.user.username || group.user.name}
            </span>
          </button>
        ))}
      </div>

      <StatusComposer open={composerOpen} onOpenChange={setComposerOpen} />
      {viewerStart && (
        <StatusViewer
          groups={visibleGroups}
          initialGroupIndex={viewerStart.groupIndex}
          initialStatusIndex={viewerStart.statusIndex}
          onClose={() => setViewerStart(null)}
        />
      )}
    </section>
  );
};

export const StatusAvatar = ({ group, fallback }: { group?: StatusGroup; fallback?: string }) => {
  const ringClass = group?.hasUnviewed ? "ring-brand" : "ring-muted-foreground/40";
  return (
    <div className={`rounded-full p-0.5 ring-2 ${ringClass}`}>
      <Avatar className="size-14 border-2 border-gray-50 dark:border-zinc-900">
        <AvatarImage src={group?.user.displayPicture} />
        <AvatarFallback>{(fallback || group?.user.name || "V").slice(0, 2)}</AvatarFallback>
      </Avatar>
    </div>
  );
};

export default StatusTray;
