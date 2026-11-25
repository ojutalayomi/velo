"use client";

import { cn } from "@/lib/utils";

interface Props {
  on: boolean;
  onChange: (on: boolean) => void;
  className?: string;
}

/** "1" in a dashed circle: send this photo, video or voice note so it can be opened only once. */
export function ViewOnceToggle({ on, onChange, className }: Props) {
  return (
    <button
      type="button"
      aria-label="View once"
      aria-pressed={on}
      title={on ? "View once: on" : "View once: off"}
      onClick={() => onChange(!on)}
      className={cn(
        "mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
        on ? "border-brand bg-brand text-white" : "border-dashed border-white/40 text-white/80 hover:border-white/70",
        className
      )}
    >
      1
    </button>
  );
}
ViewOnceToggle.displayName = "ViewOnceToggle";
