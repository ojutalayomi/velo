"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { POLL_LIMITS, PollData, sanitizePoll } from "@/lib/polls";

const DURATIONS = [
  { label: "No limit", hours: 0 },
  { label: "1 day", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
];

export function PollCreator({
  open,
  onOpenChange,
  onCreate,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (poll: PollData) => void;
  initial?: PollData | null;
}) {
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [options, setOptions] = useState<string[]>(initial?.options ?? ["", ""]);
  const [multiple, setMultiple] = useState(initial?.multiple ?? false);
  const [hours, setHours] = useState(0);

  const valid = sanitizePoll({ question, options, multiple });

  const submit = () => {
    const poll = sanitizePoll({
      question,
      options,
      multiple,
      expiresAt: hours ? new Date(Date.now() + hours * 3_600_000).toISOString() : undefined,
    });
    if (!poll) return;
    onCreate(poll);
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md bg-white dark:bg-zinc-900">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Create poll</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>Ask a question and add up to {POLL_LIMITS.maxOptions} options.</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="space-y-3">
          <Input
            value={question}
            maxLength={POLL_LIMITS.question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question"
            aria-label="Poll question"
          />
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={option}
                maxLength={POLL_LIMITS.option}
                onChange={(e) =>
                  setOptions((prev) => prev.map((o, i) => (i === index ? e.target.value : o)))
                }
                placeholder={`Option ${index + 1}`}
                aria-label={`Option ${index + 1}`}
              />
              {options.length > POLL_LIMITS.minOptions && (
                <button
                  type="button"
                  aria-label={`Remove option ${index + 1}`}
                  onClick={() => setOptions((prev) => prev.filter((_, i) => i !== index))}
                  className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          {options.length < POLL_LIMITS.maxOptions && (
            <button
              type="button"
              onClick={() => setOptions((prev) => [...prev, ""])}
              className="flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              <Plus size={16} /> Add option
            </button>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={multiple}
              onChange={(e) => setMultiple(e.target.checked)}
              className="size-4 accent-brand"
            />
            Allow multiple answers
          </label>
          <label className="flex items-center justify-between gap-2 text-sm">
            Poll length
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="rounded-md border bg-transparent px-2 py-1 dark:border-zinc-600"
            >
              {DURATIONS.map((d) => (
                <option key={d.hours} value={d.hours} className="text-black">
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ResponsiveDialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={submit} className="bg-brand text-white hover:bg-brand/90">
            Add poll
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
