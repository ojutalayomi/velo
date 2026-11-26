"use client";
import { useState } from "react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { REPORT_REASONS, ReportReason } from "@/lib/reports";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  type: "post" | "user";
  targetId: string;
  targetUserId?: string;
}

export default function ReportDialog({
  open,
  onOpenChange,
  type,
  targetId,
  targetUserId,
}: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, targetId, targetUserId, reason, details }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || "Failed");
      toast.success("Thanks, we'll review your report.");
      setReason("");
      setDetails("");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent onClick={(e) => e.stopPropagation()}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Report {type}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-2">
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="report-reason"
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
              />
              {r.label}
            </label>
          ))}
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            placeholder="Add details (optional)"
            className="mt-2 min-h-20 rounded-md border bg-transparent p-2 text-sm"
          />
          <Button onClick={submit} disabled={!reason || submitting}>
            {submitting ? "Submitting..." : "Submit report"}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
