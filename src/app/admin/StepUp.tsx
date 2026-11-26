"use client";
import { startAuthentication } from "@simplewebauthn/browser";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";

export default function StepUp() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const verify = async () => {
    setBusy(true);
    setError("");
    try {
      const optRes = await fetch("/api/admin/stepup/options", { method: "POST" });
      const opts = await optRes.json();
      if (!optRes.ok) throw new Error(opts.message || "Could not start verification");

      const response = await startAuthentication({ optionsJSON: opts });
      const res = await fetch("/api/admin/stepup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || "Failed");
      toast.success("Verified");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 p-8 text-center">
      <ShieldCheck className="size-10" />
      <h1 className="text-xl font-bold">Verify it&apos;s you</h1>
      <p className="text-sm text-gray-500">
        Confirm with your passkey to open the admin area. Access lasts 15 minutes.
      </p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button onClick={verify} disabled={busy} className="w-full">
        {busy ? "Waiting for passkey..." : "Verify with passkey"}
      </Button>
    </div>
  );
}
