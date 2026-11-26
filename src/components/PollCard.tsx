"use client";

import { BarChart3, Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";

import { cn } from "@/lib/utils";
import { isPollClosed, PollData, PollResults, PollTargetType } from "@/lib/polls";

const REFRESH_MS = 15_000;

async function request(targetType: PollTargetType, targetId: string, options?: number[]) {
  const res = await fetch(`/api/polls/${targetType}/${encodeURIComponent(targetId)}`, {
    method: options ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: options ? JSON.stringify({ options }) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "Poll request failed");
  return json.data as { poll: PollData; results: PollResults; closed: boolean };
}

export function PollCard({
  targetType,
  targetId,
  poll,
  className,
}: {
  targetType: PollTargetType;
  targetId: string;
  poll: PollData;
  className?: string;
}) {
  const [results, setResults] = useState<PollResults | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const closed = isPollClosed(poll);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    try {
      setResults((await request(targetType, targetId)).results);
    } catch {
      // keep showing the last known results
    }
  }, [targetType, targetId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const vote = async (index: number) => {
    if (closed || busy) return;
    const mine = results?.myVotes ?? [];
    let next: number[];
    if (poll.multiple) {
      next = mine.includes(index) ? mine.filter((i) => i !== index) : [...mine, index];
    } else {
      next = mine.includes(index) ? [] : [index];
    }
    setBusy(true);
    busyRef.current = true;
    try {
      setResults((await request(targetType, targetId, next)).results);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record your vote");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const total = results?.total ?? 0;
  const myVotes = results?.myVotes ?? [];

  return (
    <div
      className={cn("w-full min-w-[240px] max-w-md space-y-2 text-left", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start gap-2">
        <BarChart3 size={18} className="mt-0.5 shrink-0 text-brand" />
        <div>
          <p className="break-words font-semibold">{poll.question}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {closed ? "Final results" : poll.multiple ? "Select one or more" : "Select one"}
          </p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {poll.options.map((option, index) => {
          const count = results?.counts[index] ?? 0;
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;
          const selected = myVotes.includes(index);
          return (
            <li key={index}>
              <button
                type="button"
                disabled={closed || busy}
                onClick={() => vote(index)}
                aria-pressed={selected}
                className={cn(
                  "relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  selected ? "border-brand" : "border-gray-300 dark:border-zinc-600",
                  !closed && "hover:border-brand"
                )}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-brand/15 transition-[width] duration-300"
                  style={{ width: `${percent}%` }}
                />
                <span className="relative flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {selected && <Check size={14} className="shrink-0 text-brand" />}
                    <span className="break-words">{option}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {count} · {percent}%
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {results ? `${results.voters} ${results.voters === 1 ? "vote" : "votes"}` : "Loading…"}
      </p>
    </div>
  );
}
