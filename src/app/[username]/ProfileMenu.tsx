import { Ellipsis } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
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
import { toast } from "@/hooks/use-toast";
import { RootState } from "@/redux/store";

export default function ProfileMenu({
  username,
  profileId,
}: {
  username: string;
  profileId: string;
}) {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const userdata = useSelector((state: RootState) => state.user.userdata);

  const handleMute = () => {
    toast({ title: `Muted @${username}` });
  };
  const handleBlock = () => {
    toast({ title: `Blocked @${username}` });
  };
  const handleReport = () => {
    toast({ title: `Reported @${username}` });
  };
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/${username}`);
    toast({ title: "Profile link copied!" });
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
      {profileId !== userdata._id && (
        <>
          <hr className="my-2 border-gray-200 dark:border-gray-700" />
          <button
            onClick={handleMute}
            className="w-full rounded px-3 py-2 text-left hover:bg-muted"
          >
            Mute
          </button>
          <button
            onClick={handleBlock}
            className="w-full rounded px-3 py-2 text-left hover:bg-muted"
          >
            Block
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
      <Drawer>
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="overflow-hidden rounded-full border-2 border-zinc-200 bg-white p-1 dark:border-zinc-900 dark:bg-black">
          <Ellipsis className="size-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleShare}>Share profile via…</DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>Copy link to profile</DropdownMenuItem>
        {profileId !== userdata._id && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleMute}>Mute</DropdownMenuItem>
            <DropdownMenuItem onClick={handleBlock}>Block</DropdownMenuItem>
            <DropdownMenuItem onClick={handleReport}>Report</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
