import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from "lucide-react";

import { callCardLabel, CallRecord } from "@/lib/callRecord";
import { cn } from "@/lib/utils";

/** Call history entry shown inside the chat, like WhatsApp's. */
export function CallCard({
  record,
  viewerId,
  isGroup,
  className,
}: {
  record: CallRecord;
  viewerId: string;
  isGroup: boolean;
  className?: string;
}) {
  const { title, detail, tone } = callCardLabel(record, viewerId, isGroup);
  const mine = record.callerId === viewerId;
  const Kind = record.callType === "video" ? Video : Phone;
  const Direction =
    tone === "bad" && !mine ? PhoneMissed : mine ? PhoneOutgoing : PhoneIncoming;

  return (
    <div className={cn("flex min-w-[200px] items-center gap-3 py-1", className)}>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          tone === "bad" ? "bg-red-500/15 text-red-500" : "bg-green-500/15 text-green-600"
        )}
      >
        <Kind className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium leading-tight">{title}</p>
        <p
          className={cn(
            "flex items-center gap-1 text-xs",
            tone === "bad" ? "text-red-500" : "text-gray-500 dark:text-gray-400"
          )}
        >
          <Direction className="h-3.5 w-3.5" />
          {detail}
        </p>
      </div>
    </div>
  );
}
