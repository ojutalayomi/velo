"use client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface Entry {
  adminId: string;
  action: string;
  targetId: string;
  time: string;
  details?: { username?: string };
}

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/audit?page=${page}`);
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || "Failed");
        const json = await res.json();
        if (cancelled) return;
        setRows(json.data);
        setTotal(json.total);
        setPageSize(json.pageSize);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load audit log");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [page]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      {loading ? (
        <Loader2 className="mx-auto my-8 size-6 animate-spin" />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-gray-500">No admin actions yet.</p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {rows.map((r, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span>
                <b>{r.action}</b> · @{r.details?.username || r.targetId}
              </span>
              <span className="text-xs text-gray-500">
                admin {r.adminId.slice(-6)} · {new Date(r.time).toLocaleString()}
              </span>
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
