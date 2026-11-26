"use client";

import { LogOut, UserCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import { useUser } from "@/app/providers/UserProvider";
import { Button } from "@/components/ui/button";

const COPY = {
  "/accounts/login": { action: "log in", next: "login" },
  "/accounts/signup": { action: "sign up", next: "signup" },
} as const;

/**
 * Wraps the account pages. Someone who is already signed in when they reach the log-in or sign-up
 * page is told so, and must log out before they can use either form. The check runs once, on
 * arrival, so logging in or signing up from the form itself doesn't flash this screen on the way out.
 */
export default function AccountsGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const backTo = useSearchParams()?.get("backto");
  const { userdata, loading } = useUser();
  const [signedInOnArrival, setSignedInOnArrival] = useState<boolean | null>(null);
  const signedIn = Boolean(userdata._id);

  useEffect(() => {
    if (signedInOnArrival === null && !loading) setSignedInOnArrival(signedIn);
    // Logging out (here or elsewhere) releases the gate.
    if (signedInOnArrival && !signedIn) setSignedInOnArrival(false);
  }, [loading, signedIn, signedInOnArrival]);

  const copy = COPY[pathname as keyof typeof COPY];
  if (!copy || !signedInOnArrival || !signedIn) return <>{children}</>;

  const name = userdata.username ? `@${userdata.username}` : userdata.email;
  // Only follow a same-site path, never an arbitrary URL from the query string.
  const home = backTo && backTo.startsWith("/") && !backTo.startsWith("//") ? backTo : "/home";

  return (
    <div
      role="status"
      className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl p-2 text-center sm:border sm:border-border/50 sm:bg-white sm:p-8 sm:shadow-2xl dark:sm:border-white/8 dark:sm:bg-zinc-900"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-brand/15 text-brand">
        <UserCheck className="size-7" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-bold tracking-tight">You&apos;re already signed in</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;re signed in{name ? <> as <span className="font-medium text-foreground">{name}</span></> : null}.
          To {copy.action} with a different account, log out first.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2.5">
        <Button render={<Link href={home} />} className="h-11 w-full bg-brand font-semibold text-white hover:bg-brand/90">
          Continue to Velo
        </Button>
        <Button
          render={<Link href={`/accounts/logout?next=${copy.next}`} />}
          variant="outline"
          className="h-11 w-full gap-2"
        >
          <LogOut aria-hidden="true" />
          Log out to {copy.action}
        </Button>
      </div>
    </div>
  );
}
