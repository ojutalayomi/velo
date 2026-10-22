import {
  Repeat2,
  PenLine,
} from "lucide-react";
import { ReactNode, useState } from "react";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { PostSchema } from "@/lib/types/type";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/redux/hooks";
import { updatePost } from "@/redux/postsSlice";

import PostMaker from "./PostMaker";
import { Button } from "./ui/button";
import {
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  Drawer,
} from "./ui/drawer";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "./ui/dropdown-menu";

interface Option {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
}

export default function ShareButton({
  children,
  post,
  onShareCommitted,
  triggerClassName,
}: {
  children: ReactNode;
  post?: PostSchema;
  /** Called after repost / undo repost Redux updates so hosts (e.g. Explore reel) can sync local lists. */
  onShareCommitted?: (postId: string, updates: Partial<PostSchema>) => void;
  triggerClassName?: string;
}) {
  const { userdata } = useUser();
  const dispatch = useAppDispatch();
  const socket = useSocket();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);


  const options: Option[] = [
    ...(!post?.Shared
      ? [
          {
            icon: <Repeat2 size={20} />,
            text: "Repost",
            onClick: () => {
              if (!post || !socket) return;

              dispatch(
                updatePost({
                  id: post.PostID,
                  updates: { NoOfShares: post.NoOfShares + 1, Shared: true },
                })
              );
              socket.emit("reactToPost(share)", {
                action: "share",
                type: "repost",
                post,
              });
              onShareCommitted?.(post.PostID, { NoOfShares: post.NoOfShares + 1, Shared: true });
            },
          },
        ]
      : [
          {
            icon: <Repeat2 size={20} />,
            text: "Undo Repost",
            onClick: () => {
              if (!post || !socket) return;
              dispatch(
                updatePost({
                  id: post.PostID,
                  updates: { NoOfShares: post.NoOfShares - 1, Shared: false },
                })
              );

              socket?.emit("reactToPost(share)", {
                action: "unshare",
                post,
              });
              onShareCommitted?.(post.PostID, {
                NoOfShares: Math.max(0, post.NoOfShares - 1),
                Shared: false,
              });
            },
          },
        ]),
    {
      icon: <PenLine size={20} />,
      text: "Quote",
      onClick: () => {
        // Close other components before opening the quote modal
        setIsDrawerOpen(false);
        setIsPopoverOpen(false);
        setIsQuoteModalOpen(true);
      },
    },
  ];

  // Handle mobile drawer
  const handleDrawerChange = (open: boolean) => {
    setIsDrawerOpen(open);
  };

  // Handle desktop popover
  const handlePopoverChange = (open: boolean) => {
    setIsPopoverOpen(open);
  };

  if (!userdata._id)
    return (
      <div className="flex cursor-not-allowed items-center justify-center gap-2">{children}</div>
    );

  return (
    <>
      {/* Mobile view */}
      <Drawer open={isDrawerOpen} onOpenChange={handleDrawerChange}>
        <DrawerTrigger
          className={cn(
            "tablets:hidden blog-foot flex items-center justify-center gap-2 cursor-pointer",
            triggerClassName
          )}
        >
          {children}
        </DrawerTrigger>
        <DrawerContent className="tablets:hidden">
          <DrawerHeader className="text-left">
            <DrawerTitle className="hidden">Options</DrawerTitle>
            <DrawerDescription className="flex flex-col gap-2">
              {options.map(({ icon, text, onClick }, index) => {
                return (
                  <span
                    key={index}
                    className="flex w-full cursor-pointer items-center gap-1"
                    onClick={onClick}
                  >
                    {icon}
                    <span className="dark:text-white">{text}</span>
                  </span>
                );
              })}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Desktop view */}
      <DropdownMenu open={isPopoverOpen} onOpenChange={handlePopoverChange}>
        <DropdownMenuTrigger
          className={cn(
            "!hidden blog-foot !tablets:flex items-center justify-center gap-2 cursor-pointer",
            triggerClassName
          )}
        >
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mr-2 mt-1 hidden w-auto space-y-2 rounded-md bg-white p-2 shadow-lg tablets:block dark:bg-zinc-800">
          {options.map(({ icon, text, onClick }, index) => {
            return (
              <Button
                key={index}
                className="flex w-full cursor-pointer items-center gap-1 bg-white text-black hover:bg-white/90 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-900/90"
                onClick={onClick}
              >
                {icon}
                <span className="dark:text-white">{text}</span>
              </Button>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Separate Dialog component */}
      <PostMaker
        type="quote"
        post={post}
        open={isQuoteModalOpen}
        onOpenChange={setIsQuoteModalOpen}
      />
    </>
  );
}
