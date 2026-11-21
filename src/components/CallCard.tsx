import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from "lucide-react";

import { useOptionalCall } from "@/components/call/callContext";
import { useReactors } from "@/hooks/useReactors";
import { callCardLabel, CallRecord } from "@/lib/callRecord";
import { cn } from "@/lib/utils";

/** Call history entry shown inside the chat, like WhatsApp's. */
export function CallCard({
  record,
  viewerId,
  isGroup,
  chatId,
  receiverId,
  className,
}: {
  record: CallRecord;
  viewerId: string;
  isGroup: boolean;
  /** The chat the call belonged to. */
  chatId: string;
  /** The other person in a DM (the card is stored as sent by the caller). */
  receiverId: string;
  className?: string;
}) {
  const call = useOptionalCall();
  // In a DM, the person to call back is whoever was on the other end of this call.
  const otherId = record.callerId === viewerId ? receiverId : record.callerId;
  const lookup = useReactors(isGroup ? [] : [otherId]);
  const { title, detail, tone } = callCardLabel(record, viewerId, isGroup);
  const mine = record.callerId === viewerId;
  const Kind = record.callType === "video" ? Video : Phone;
  const Direction = tone === "bad" && !mine ? PhoneMissed : mine ? PhoneOutgoing : PhoneIncoming;

  return (
    <div className={cn("min-w-[200px] py-1", className)}>
      <div className="flex items-center gap-3">
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
      <button
        type="button"
        disabled={!call || call.state.status !== "idle"}
        onClick={() => {
          const other = isGroup ? undefined : lookup(otherId);
          void call?.startCall({
            roomId: chatId,
            targetUserId: isGroup ? undefined : otherId,
            callType: record.callType,
            chatType: isGroup ? "Group" : "DM",
            peer: {
              id: isGroup ? undefined : otherId,
              name: other?.name ?? (isGroup ? "Group call" : "Calling…"),
              avatar: other?.displayPicture,
            },
          });
        }}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand/10 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Kind className="h-4 w-4" />
        {isGroup ? "Call again" : "Call back"}
      </button>
    </div>
  );
}
