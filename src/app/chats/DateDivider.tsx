import { ReactNode } from "react";

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export const getDayKey = (timestamp: string) => dayKey(new Date(timestamp));

export const formatDayLabel = (timestamp: string, now: Date = new Date()) => {
  const date = new Date(timestamp);
  if (dayKey(date) === dayKey(now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(date) === dayKey(yesterday)) return "Yesterday";
  const diffDays = (now.getTime() - date.getTime()) / 86_400_000;
  if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "long" });
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
};

/** Sticky day label. Each group owns its label, so the next day's label pushes it out. */
export const DateGroup = ({
  timestamp,
  children,
}: {
  timestamp: string;
  children: ReactNode;
}) => (
  <section data-date={getDayKey(timestamp)}>
    <div className="pointer-events-none sticky top-2 z-[1] my-3 flex justify-center">
      <span className="rounded-full border border-gray-200/70 bg-white/80 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm backdrop-blur-md dark:border-zinc-700/70 dark:bg-zinc-800/80 dark:text-gray-300">
        {formatDayLabel(timestamp)}
      </span>
    </div>
    {children}
  </section>
);
