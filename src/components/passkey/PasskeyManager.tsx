"use client";

import { Cloud, KeyRound, Laptop, Loader2, Plus, Smartphone, Trash2 } from "lucide-react";
import moment from "moment";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { deletePasskey, listPasskeys } from "@/lib/passkey-client";
import { cn } from "@/lib/utils";

import { PasskeyRegister } from "./PasskeyRegister";

interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string;
  transports?: string[];
  credentialBackedUp?: boolean;
  credentialDeviceType?: string;
}

const PHONE = /iphone|ipad|android|pixel|galaxy|samsung|tecno|infinix|itel|oppo|vivo|xiaomi|redmi|huawei|phone|tablet/i;
const COMPUTER = /mac|windows|laptop|desktop|pc|linux|chromebook/i;

/** Phone, computer, or a plain key when we can't tell (e.g. a security key). */
export function passkeyKind(passkey: Pick<Passkey, "name" | "transports">) {
  if (PHONE.test(passkey.name)) return "phone";
  if (COMPUTER.test(passkey.name)) return "computer";
  const transports = passkey.transports ?? [];
  if (transports.includes("hybrid")) return "phone";
  if (transports.some((t) => t === "usb" || t === "nfc" || t === "ble")) return "key";
  return "computer";
}

const ICONS = { phone: Smartphone, computer: Laptop, key: KeyRound };

export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listPasskeys().then((result) => {
      if (cancelled) return;
      if (result.success && result.passkeys) setPasskeys(result.passkeys);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reloads]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deletePasskey(id);
    if (result.success) setPasskeys((list) => list.filter((p) => p.id !== id));
    setDeletingId(null);
  };

  return (
    <section>
      <h2 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Passkeys
      </h2>
      <p className="mb-2 px-1 text-sm text-gray-500 dark:text-gray-400">
        Sign in with your face, fingerprint or device PIN instead of a password.
      </p>
      <div className="divide-y overflow-hidden rounded-2xl border bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {isLoading ? (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="size-9 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-48 rounded" />
            </div>
          </div>
        ) : (
          passkeys.map((passkey) => {
            const Icon = ICONS[passkeyKind(passkey)];
            return (
              <div key={passkey.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300">
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{passkey.name}</p>
                    {passkey.credentialBackedUp && (
                      <span
                        title="Backed up to your account's cloud, so it works on a new device"
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[11px] font-medium text-green-600 dark:text-green-400"
                      >
                        <Cloud size={11} />
                        Backed up
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Added {moment(passkey.createdAt).fromNow()} · used{" "}
                    {moment(passkey.lastUsedAt).fromNow()}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Delete passkey ${passkey.name}`}
                      disabled={deletingId === passkey.id}
                      className="flex size-10 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {deletingId === passkey.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this passkey?</AlertDialogTitle>
                      <AlertDialogDescription>
                        &quot;{passkey.name}&quot; will no longer sign you in. You can add it again
                        later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(passkey.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })
        )}

        {!isLoading && passkeys.length === 0 && (
          <p className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
            No passkeys yet. Add one to sign in faster and more safely.
          </p>
        )}

        <PasskeyRegister
          onSuccess={() => setReloads((n) => n + 1)}
          trigger={
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
                "hover:bg-gray-50 dark:hover:bg-zinc-800/60"
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Plus size={20} />
              </div>
              <span className="font-medium text-brand">Add a passkey</span>
            </button>
          }
        />
      </div>
    </section>
  );
}
