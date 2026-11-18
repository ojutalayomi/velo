"use client";
import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminUserRow {
  _id: string;
  username: string;
  name?: string;
  email?: string;
  displayPicture?: string;
  verified?: boolean;
  suspended?: boolean;
  role?: string;
}

type Action = "verify" | "unverify" | "suspend" | "unsuspend";

export default function UsersAdmin() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}&page=${page}`);
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || "Failed");
      const json = await res.json();
      setRows(json.data);
      setTotal(json.total);
      setPageSize(json.pageSize);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (id: string, action: Action) => {
    if (action === "suspend" && !confirm("Suspend this user? They will be locked out.")) return;
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return toast.error(json?.message || "Action failed");
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...json.data } : r)));
    toast.success("Done");
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 size-5 text-gray-500" />
        <Input
          className="pl-10"
          placeholder="Search by username, name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <Loader2 className="mx-auto my-8 size-6 animate-spin" />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-gray-500">No users found.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {rows.map((u) => (
            <li key={u._id} className="flex flex-wrap items-center gap-3 p-3">
              <Avatar className="size-10">
                <AvatarImage src={u.displayPicture} />
                <AvatarFallback>{u.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {u.name || u.username}
                  {u.role === "admin" && (
                    <span className="ml-2 rounded bg-gray-200 px-1.5 text-xs dark:bg-zinc-700">
                      admin
                    </span>
                  )}
                  {u.verified && <span className="ml-2 text-xs text-brand">verified</span>}
                  {u.suspended && <span className="ml-2 text-xs text-red-500">suspended</span>}
                </p>
                <p className="truncate text-sm text-gray-500">
                  @{u.username} · {u.email}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => act(u._id, u.verified ? "unverify" : "verify")}
              >
                {u.verified ? "Unverify" : "Verify"}
              </Button>
              {u.role !== "admin" && (
                <Button
                  size="sm"
                  variant={u.suspended ? "outline" : "destructive"}
                  onClick={() => act(u._id, u.suspended ? "unsuspend" : "suspend")}
                >
                  {u.suspended ? "Unsuspend" : "Suspend"}
                </Button>
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
