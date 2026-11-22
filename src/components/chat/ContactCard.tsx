"use client";

import { MessageSquareText, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";

import { useUser } from "@/app/providers/UserProvider";
import { Statuser } from "@/components/VerificationComponent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SharedContact } from "@/lib/chatShare";
import { RootState } from "@/redux/store";

/** A shared Velo user, with shortcuts to message them or open their profile. */
export function ContactCard({ contact }: { contact: SharedContact }) {
  const router = useRouter();
  const { userdata } = useUser();
  const dm = useSelector((state: RootState) =>
    state.chat.conversations.find((c) => c.type === "DM" && c.participants.includes(contact.userId))
  );
  const isMe = contact.userId === userdata._id;

  const buttonClass =
    "flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand/10 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand/20";

  return (
    <div className="w-[240px] max-w-full rounded-xl border border-gray-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex items-center gap-3">
        <Avatar className="size-12">
          <AvatarImage src={contact.displayPicture} alt={contact.name} className="object-cover" />
          <AvatarFallback className="capitalize">{contact.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <span className="truncate">{contact.name}</span>
            {contact.verified && <Statuser className="size-4 flex-shrink-0" />}
          </p>
          {contact.username && <p className="truncate text-xs text-gray-500">@{contact.username}</p>}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {!isMe && (
          <button
            type="button"
            className={buttonClass}
            // An existing conversation opens directly; otherwise the profile is the way in.
            onClick={() => router.push(dm ? `/chats/${dm.id}` : `/${contact.username}`)}
          >
            <MessageSquareText className="size-3.5" />
            Message
          </button>
        )}
        <button type="button" className={buttonClass} onClick={() => router.push(`/${contact.username}`)}>
          <UserRound className="size-3.5" />
          Profile
        </button>
      </div>
    </div>
  );
}
