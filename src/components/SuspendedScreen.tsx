"use client";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

/** Shown in place of the app when the signed-in account has been suspended. */
export default function SuspendedScreen() {
  return (
    <main
      role="alert"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white px-6 text-center dark:bg-zinc-950 dark:text-white"
    >
      <ShieldAlert className="size-12 text-red-500" aria-hidden />
      <h1 className="text-2xl font-bold">Your account has been suspended</h1>
      <p className="max-w-md text-gray-600 dark:text-gray-400">
        You can no longer use Velo with this account. If you think this is a mistake, contact support and we will take a look.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href="/help-support"
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Contact support
        </Link>
        <Link href="/accounts/login" className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white">
          Sign in with another account
        </Link>
      </div>
    </main>
  );
}
