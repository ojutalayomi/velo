"use client";
import { Link2Off, Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";

import { useUser } from "@/app/providers/UserProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ChatRepository from "@/lib/class/ChatRepository";
import ChatSystem from "@/lib/class/chatSystem";
import { ChatInvitePreview, InviteBlockReason } from "@/lib/types/type";
import { fetchChats } from "@/redux/chatSlice";
import { useAppDispatch } from "@/redux/hooks";

const chatSystem = new ChatSystem(new ChatRepository());

const REASON_TEXT: Record<InviteBlockReason, string> = {
  not_found: "This invite link is not valid. Ask a group admin to send you a new one.",
  expired: "This invite link has expired. Ask a group admin to send you a new one.",
  disabled: "A group admin turned this invite link off.",
  full: "This invite link has reached its join limit.",
};

const actionClass =
  "mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:pointer-events-none disabled:opacity-50";

const InviteJoin = ({ token }: { token: string }) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { userdata, loading: userLoading } = useUser();
  const [preview, setPreview] = useState<ChatInvitePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    chatSystem
      .previewInvite(token)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load this invite");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const signedIn = Boolean(userdata._id);

  const join = async () => {
    if (joining) return;
    setJoining(true);
    try {
      const result = await chatSystem.joinInvite(token);
      // The realtime push may not have landed yet, so pull the conversation list too.
      if (!result.alreadyMember) await fetchChats(dispatch);
      toast.success(`You joined ${preview?.name || "the group"}`);
      router.replace(`/chats/group/${result.chatId}`);
    } catch (error) {
      toast.error("Could not join the group", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
      setJoining(false);
    }
  };

  const openGroup = () => router.replace(`/chats/group/${preview?.chatId}`);

  const signIn = () =>
    router.push(`/accounts/login?backto=${encodeURIComponent(`/invite/${token}`)}`);

  return (
    <div className="flex size-full items-center justify-center overflow-y-auto bg-gray-50 p-4 dark:bg-neutral-900">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xs dark:bg-neutral-800">
        {userLoading || (!preview && !loadError) ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-gray-400" />
          </div>
        ) : !preview ? (
          <>
            <Link2Off className="mx-auto size-10 text-gray-400" />
            <h1 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
              Invite unavailable
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{loadError}</p>
          </>
        ) : !preview.valid ? (
          <>
            <Link2Off className="mx-auto size-10 text-gray-400" />
            <h1 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
              {preview.name || "This invite link"}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {REASON_TEXT[preview.reason ?? "not_found"]}
            </p>
          </>
        ) : (
          <>
            <Avatar className="mx-auto size-20 border-2 border-white shadow-md dark:border-neutral-900">
              <AvatarFallback className="text-xl">
                {preview.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
              <AvatarImage
                src={preview.displayPicture}
                alt={preview.name}
                className="size-20 rounded-full object-cover"
              />
            </Avatar>
            <h1 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
              {preview.name}
            </h1>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              <Users className="size-3.5" />
              {preview.memberCount} members
            </span>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {preview.isMember
                ? "You are already a member of this group."
                : signedIn
                  ? "You have been invited to join this group."
                  : "Sign in with your Velo account to join this group."}
            </p>
            {preview.isMember ? (
              <button type="button" onClick={openGroup} className={actionClass}>
                Open group
              </button>
            ) : signedIn ? (
              <button
                type="button"
                onClick={() => void join()}
                disabled={joining}
                className={actionClass}
              >
                {joining && <Loader2 className="size-4 animate-spin" />}
                Join group
              </button>
            ) : (
              <button type="button" onClick={signIn} className={actionClass}>
                Sign in to join
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InviteJoin;