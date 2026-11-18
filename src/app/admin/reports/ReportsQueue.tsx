"use client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { REPORT_REASONS, ReportStatus } from "@/lib/reports";

interface Row {
  _id: string;
  type: "post" | "user";
  targetId: string;
  targetUserId?: string;
  targetUsername?: string;
  reporterId: string;
  reason: string;
  details?: string;
  time: string;
}

const STATUSES: ReportStatus[] = ["open", "resolved", "dismissed"];

export default function ReportsQueue() {
  const [status, setStatus] = useState<ReportStatus>("open");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/reports?status=${status}&page=${page}`);
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || "Failed");
        const json = await res.json();
        if (cancelled) return;
        setRows(json.data);
        setTotal(json.total);
        setPageSize(json.pageSize);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load reports");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [status, page]);

  const review = async (id: string, next: "resolved" | "dismissed") => {
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    if (!res.ok) return toast.error((await res.json().catch(() => null))?.message || "Failed");
    setRows((prev) => prev.filter((r) => r._id !== id));
    setTotal((n) => n - 1);
  };

  const hidePost = async (postId: string) => {
    if (!confirm("Hide this post from all feeds?")) return;
    const res = await fetch("/api/admin/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, action: "hide" }),
    });
    if (!res.ok) return toast.error((await res.json().catch(() => null))?.message || "Failed");
    toast.success("Post hidden");
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const label = (v: string) => REPORT_REASONS.find((r) => r.value === v)?.label ?? v;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === status ? "default" : "outline"}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {loading ? (
        <Loader2 className="mx-auto my-8 size-6 animate-spin" />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-gray-500">No {status} reports.</p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {rows.map((r) => (
            <li key={r._id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {label(r.reason)} · {r.type}
                  {r.targetUsername && (
                    <>
                      {" "}
                      on{" "}
                      <Link className="underline" href={`/${r.targetUsername}`} target="_blank">
                        @{r.targetUsername}
                      </Link>
                    </>
                  )}
                </p>
                {r.details && <p className="text-gray-500">&ldquo;{r.details}&rdquo;</p>}
                <p className="text-xs text-gray-500">
                  {new Date(r.time).toLocaleString()} · reporter {r.reporterId.slice(-6)}
                  {r.type === "post" && ` · post ${r.targetId.slice(0, 12)}`}
                </p>
              </div>
              {status === "open" && (
                <>
                  {r.type === "post" && (
                    <Button size="sm" variant="destructive" onClick={() => hidePost(r.targetId)}>
                      Hide post
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => review(r._id, "dismissed")}>
                    Dismiss
                  </Button>
                  <Button size="sm" onClick={() => review(r._id, "resolved")}>
                    Resolve
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </Button>
        <span>
          Page {page} of {pages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
