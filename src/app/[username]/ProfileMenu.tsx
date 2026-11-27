import { Ellipsis } from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "@/lib/toast";
import { useMediaQuery } from "usehooks-ts";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { setUserMuted } from "@/lib/userRelations";
import { RootState } from "@/redux/store";

export default function ProfileMenu({
  username,
  profileId,
}: {
  username: string;
  profileId: string;
}) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const userdata = useSelector((state: RootState) => state.user.userdata);
  const [blocked, setBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const canBlock = profileId !== userdata._id;

  const refreshBlockState = async () => {
    if (!canBlock) return;
    try {
      const response = await fetch("/api/blocks");
      if (!response.ok) return;
      const body = (await response.json()) as { blockedUserIds?: string[] };
      setBlocked(Boolean(body.blockedUserIds?.includes(profileId)));
      const mutes = await fetch("/api/mutes");
      if (mutes.ok) {
        const mutedBody = (await mutes.json()) as { mutedUserIds?: string[] };
        setMuted(Boolean(mutedBody.mutedUserIds?.includes(profileId)));
      }
    } catch {
      // Menu still works without the current block state.
    }
  };

  const handleMute = async () => {
    const error = await setUserMuted(profileId, !muted);
    if (error) {
      toast.error(error);
      return;
    }
    setMuted(!muted);
    toast(muted ? `Unmuted @${username}` : `Muted @${username}`);
  };
  const handleBlock = async () => {
    if (blockBusy) return;
    setBlockBusy(true);

    try {
      const response = await fetch("/api/blocks", {
        method: blocked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileId }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message || "Could not update block status");

      setBlocked((current) => !current);
      toast(blocked ? `Unblocked @${username}` : `Blocked @${username}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update block status");
    } finally {
      setBlockBusy(false);
    }
  };
  const handleReport = () => {
    toast(`Reported @${username}`);
  };
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/${username}`);
    toast("Profile link copied!");
  };
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ url: `${window.location.origin}/${username}` });
    } else {
      handleCopyLink();
    }
  };

  // For mobile drawer, use plain buttons
  const mobileMenuItems = (
    <div className="flex flex-col space-y-2 p-4">
      <button onClick={handleShare} className="w-full rounded px-3 py-2 text-left hover:bg-muted">
        Share profile via…
      </button>
      <button
        onClick={handleCopyLink}
        className="w-full rounded px-3 py-2 text-left hover:bg-muted"
      >
        Copy link to profile
      </button>
      {canBlock && (
        <>
          <hr className="my-2 border-gray-200 dark:border-gray-700" />
          <button
            onClick={handleMute}
            className="w-full rounded px-3 py-2 text-left hover:bg-muted"
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={handleBlock}
            disabled={blockBusy}
            className="w-full rounded px-3 py-2 text-left hover:bg-muted disabled:opacity-60"
          >
            {blocked ? "Unblock" : "Block"}
          </button>
          <button
            onClick={handleReport}
            className="w-full rounded px-3 py-2 text-left hover:bg-muted"
          >
            Report
          </button>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        onOpenChange={(open) => {
          if (open) refreshBlockState();
        }}
      >
        <DrawerTrigger asChild>
          <button className="overflow-hidden rounded-full border-2 border-zinc-200 bg-white p-1 dark:border-zinc-900 dark:bg-black">
            <Ellipsis className="size-6" />
          </button>
        </DrawerTrigger>
        <DrawerContent aria-describedby="Options" aria-labelledby="Options">
          <DrawerHeader className="hidden text-left">
            <DrawerTitle className="text-left">Options</DrawerTitle>
            <DrawerDescription className="text-left">Options</DrawerDescription>
          </DrawerHeader>
          {mobileMenuItems}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: use DropdownMenu as before
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) refreshBlockState();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button className="overflow-hidden rounded-full border-2 border-zinc-200 bg-white p-1 dark:border-zinc-900 dark:bg-black">
          <Ellipsis className="size-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleShare}>Share profile via…</DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>Copy link to profile</DropdownMenuItem>
        {canBlock && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleMute}>{muted ? "Unmute" : "Mute"}</DropdownMenuItem>
            <DropdownMenuItem onClick={handleBlock} disabled={blockBusy}>
              {blocked ? "Unblock" : "Block"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleReport}>Report</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
