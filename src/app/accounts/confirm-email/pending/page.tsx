"use client";
import { Loader, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";

import { generateCode } from "../failed/action";

const COOLDOWN_SECONDS = 60;

export default function PendingPage() {
  return (
    <Suspense fallback={<></>}>
      <PendingPageClient />
    </Suspense>
  );
}

function PendingPageClient() {
  const email = useSearchParams()?.get("email") ?? "";
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function resend() {
    setLoading(true);
    try {
      const { message } = await generateCode({ email });
      toast(message);
      setCooldown(COOLDOWN_SECONDS);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dark:text-white">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <Mail size={60} className="text-brand" />
        <h1 className="text-xl font-semibold">Confirm your email to continue</h1>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link{email ? ` to ${email}` : ""}. Open it to activate your account
          and sign in. The link expires in 1 hour.
        </p>
        <Button
          onClick={resend}
          disabled={loading || cooldown > 0 || !email}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-white hover:bg-tomatom focus:outline-hidden focus:ring-2 focus:ring-brand"
        >
          {loading ? <Loader className="animate-spin" size={20} /> : null}
          <span>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend confirmation email"}</span>
        </Button>
        <Link className="text-xs text-muted-foreground hover:text-brand" href="/accounts/login">
          Back to log in
        </Link>
      </div>
    </div>
  );
}
