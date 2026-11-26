"use client";
import { Copy, Link as LinkIcon, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";

import { Switch } from "@/components/ui";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ChatRepository from "@/lib/class/ChatRepository";
import ChatSystem from "@/lib/class/chatSystem";
import { ChatInviteMetadata } from "@/lib/types/type";

const chatSystem = new ChatSystem(new ChatRepository());

const DEFAULT_HOURS = 24 * 7;
const EXPIRY_OPTIONS = [
  { hours: 24, label: "24 hours" },
  { hours: DEFAULT_HOURS, label: "7 days" },
  { hours: 24 * 30, label: "30 days" },
];
const USE_OPTIONS = [1, 5, 10, 25, 50, 100];

const selectClass =
  "rounded-md border bg-white px-2 py-1.5 text-sm text-gray-900 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200";

const GroupInviteCard = ({ chatId }: { chatId: string }) => {
  const [metadata, setMetadata] = useState<ChatInviteMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [cap, setCap] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  // Only the create/reset response carries a link, so it lives in memory for this visit only.
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    chatSystem
      .getInvite(chatId)
      .then((data) => {
        if (cancelled) return;
        setMetadata(data);
        setCap(data.maxUses);
        setNow(Date.now());
      })
      .catch(() => {
        if (!cancelled) setMetadata(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  const exists = Boolean(metadata?.exists);
  const expired = metadata?.expiresAt
    ? new Date(metadata.expiresAt).getTime() <= now
    : false;
  const full = metadata ? metadata.maxUses !== null && metadata.uses >= metadata.maxUses : false;
  const status = !exists
    ? "No link yet"
    : expired
      ? "Expired"
      : !metadata?.enabled
        ? "Turned off"
        : full
          ? "Join limit reached"
          : "Active";

  const apply = async (updates: {
    enabled?: boolean;
    expiresInHours?: number;
    maxUses?: number | null;
  }) => {
    if (busy) return;
    setBusy(true);
    try {
      setMetadata(await chatSystem.updateInvite(chatId, updates));
    } catch (error) {
      setCap(metadata?.maxUses ?? null);
      toast.error("Could not update the invite link", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await chatSystem.createInvite(chatId, {
        expiresInHours: hours,
        maxUses: cap,
      });
      setMetadata(result);
      setLink(result.link);
      setResetOpen(false);
      toast.success("New invite link created");
    } catch (error) {
      toast.error("Could not create the invite link", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const absoluteLink = link ? `${window.location.origin}${link}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteLink);
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy", { description: "Select the link and copy it manually." });
    }
  };

  const useOptions =
    cap !== null && !USE_OPTIONS.includes(cap) ? [cap, ...USE_OPTIONS] : USE_OPTIONS;

  return (
    <section>
      <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Invite link
      </h2>
      <div className="divide-y overflow-hidden rounded-xl bg-white shadow-xs dark:divide-neutral-700 dark:bg-neutral-800">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="rounded-lg bg-gray-100 p-2 dark:bg-neutral-900">
              <LinkIcon className="text-brand" size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Anyone with the link can join
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {loading ? "Loading…" : status}
                {exists && metadata && !loading && (
                  <>
                    {" · "}
                    {metadata.uses}
                    {metadata.maxUses === null ? " joins" : ` of ${metadata.maxUses} joins used`}
                  </>
                )}
              </p>
            </div>
          </div>
          {exists && (
            <Switch
              id="invite-enabled"
              checked={Boolean(metadata?.enabled)}
              onChange={(value) => void apply({ enabled: value })}
            />
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="size-5 animate-spin text-gray-400" />
          </div>
        ) : !exists ? (
          <div className="space-y-3 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create a link so people can join without being added one by one. It expires after 7
              days and has no join limit until you change it.
            </p>
            <button
              type="button"
              onClick={() => void create()}
              disabled={busy}
              className="flex items-center gap-2 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:pointer-events-none disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Create invite link
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Expires
                <select
                  value={hours}
                  disabled={busy}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setHours(value);
                    void apply({ expiresInHours: value });
                  }}
                  className={`mt-1 w-full ${selectClass}`}
                >
                  {EXPIRY_OPTIONS.map((option) => (
                    <option key={option.hours} value={option.hours}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block font-normal text-gray-400">
                  {metadata?.expiresAt
                    ? `Currently ${new Date(metadata.expiresAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}`
                    : ""}
                </span>
              </label>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Join limit
                <select
                  value={cap ?? ""}
                  disabled={busy}
                  onChange={(event) => {
                    const value = event.target.value === "" ? null : Number(event.target.value);
                    setCap(value);
                    void apply({ maxUses: value });
                  }}
                  className={`mt-1 w-full ${selectClass}`}
                >
                  <option value="">Unlimited</option>
                  {useOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} {option === 1 ? "join" : "joins"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {link ? (
              <div className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={absoluteLink}
                    aria-label="Invite link"
                    onFocus={(event) => event.currentTarget.select()}
                    className="w-full rounded-md border bg-gray-50 px-2 py-1.5 text-xs text-gray-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => void copy()}
                    aria-label="Copy invite link"
                    className="shrink-0 rounded-md bg-brand p-2 text-white transition-colors hover:bg-brand-dark"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Copy it now — this link is not shown again.
                </p>
              </div>
            ) : (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
                The link is hidden because only its hash is stored. Reset it to reveal a new one.
              </p>
            )}

            <div className="p-4">
              <button
                type="button"
                onClick={() => setResetOpen(true)}
                disabled={busy}
                className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-900"
              >
                <RotateCcw size={16} />
                Reset link
              </button>
            </div>
          </>
        )}
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the invite link?</AlertDialogTitle>
            <AlertDialogDescription>
              The current link stops working immediately and its join count goes back to zero. The
              new link is shown once, so copy it before you close this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <button
              type="button"
              onClick={() => void create()}
              disabled={busy}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:pointer-events-none disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Reset link
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default GroupInviteCard;