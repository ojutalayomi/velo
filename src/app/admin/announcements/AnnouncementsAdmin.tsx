"use client";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Row {
  _id: string;
  title: string;
  message: string;
  url?: string;
  active: boolean;
  createdAt: string;
  expiresAt?: string | null;
}

export default function AnnouncementsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/announcements");
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || "Failed");
      setRows((await res.json()).data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Publish this announcement to ALL users?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          url,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Failed to publish");
      setRows((prev) => [json.data, ...prev]);
      setTitle("");
      setMessage("");
      setUrl("");
      setExpiresAt("");
      toast.success("Announcement published");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string, active: boolean) => {
    const res = await fetch("/api/admin/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return toast.error(json?.message || "Action failed");
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, active } : r)));
  };

  const isLive = (r: Row) => r.active && (!r.expiresAt || new Date(r.expiresAt) > new Date());

  return (
    <div className="space-y-6">
      <form onSubmit={publish} className="space-y-3 rounded-md border p-4">
        <p className="text-sm text-gray-500">
          Users see the newest live announcement as a dismissible banner.
        </p>
        <Input
          placeholder="Title"
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="min-h-24 w-full rounded-md border bg-transparent p-2 text-sm"
          placeholder="Message"
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <Input
          placeholder="Optional link (/path or https://…)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <label className="block text-sm text-gray-500">
          Expires (optional)
          <Input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </label>
        <Button type="submit" disabled={saving}>
          {saving ? "Publishing…" : "Publish to everyone"}
        </Button>
      </form>

      {loading ? (
        <Loader2 className="mx-auto my-8 size-6 animate-spin" />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-gray-500">No announcements yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {rows.map((r) => (
            <li key={r._id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {r.title}
                  <span className={`ml-2 text-xs ${isLive(r) ? "text-brand" : "text-gray-500"}`}>
                    {isLive(r) ? "live" : r.active ? "expired" : "retired"}
                  </span>
                </p>
                <p className="line-clamp-2 text-sm text-gray-500">{r.message}</p>
                <p className="text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleString()}
                  {r.expiresAt && ` · expires ${new Date(r.expiresAt).toLocaleString()}`}
                </p>
              </div>
              <Button
                size="sm"
                variant={r.active ? "destructive" : "outline"}
                onClick={() => toggle(r._id, !r.active)}
              >
                {r.active ? "Retire" : "Republish"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
