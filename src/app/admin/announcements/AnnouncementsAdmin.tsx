"use client";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";

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
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setMessage("");
    setUrl("");
    setExpiresAt("");
  };

  // datetime-local wants local "YYYY-MM-DDTHH:mm".
  const toLocalInput = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const startEdit = (r: Row) => {
    setEditingId(r._id);
    setTitle(r.title);
    setMessage(r.message);
    setUrl(r.url ?? "");
    setExpiresAt(toLocalInput(r.expiresAt));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId && !confirm("Publish this announcement to ALL users?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId && { id: editingId }),
          title,
          message,
          url,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Failed to publish");
      if (editingId) {
        setRows((prev) => prev.map((r) => (r._id === editingId ? json.data : r)));
      } else {
        setRows((prev) => [json.data, ...prev]);
      }
      resetForm();
      if (json.live === false) {
        toast.warning("Saved, but live delivery failed. Users will see it on their next page load.");
      } else {
        toast.success(editingId ? "Announcement updated" : "Announcement published");
      }
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
    if (json?.live === false) {
      toast.warning("Saved, but live delivery failed. Users will see the change on their next page load.");
    }
  };

  const remove = async (r: Row) => {
    if (!confirm(`Permanently delete "${r.title}"? This cannot be undone.`)) return;
    const res = await fetch("/api/admin/announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r._id }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return toast.error(json?.message || "Delete failed");
    setRows((prev) => prev.filter((x) => x._id !== r._id));
    if (editingId === r._id) resetForm();
    toast.success("Announcement deleted");
  };

  const isLive = (r: Row) => r.active && (!r.expiresAt || new Date(r.expiresAt) > new Date());

  return (
    <div className="space-y-6">
      <form onSubmit={publish} className="space-y-3 rounded-md border p-4">
        <p className="text-sm text-gray-500">
          {editingId
            ? "Editing an announcement. Live viewers see the corrected text immediately."
            : "Users see the newest live announcement as a dismissible banner."}
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
          {saving ? "Saving…" : editingId ? "Save changes" : "Publish to everyone"}
        </Button>
        {editingId && (
          <Button type="button" variant="outline" className="ml-2" onClick={resetForm}>
            Cancel
          </Button>
        )}
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
              <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant={r.active ? "destructive" : "outline"}
                onClick={() => toggle(r._id, !r.active)}
              >
                {r.active ? "Retire" : "Republish"}
              </Button>
              {!r.active && (
                <Button size="sm" variant="destructive" onClick={() => remove(r)}>
                  Delete
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
