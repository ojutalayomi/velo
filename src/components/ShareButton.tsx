import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { useGlobalFileStorage } from "@/hooks/useFileStorage";
import { updateLiveTime } from "@/lib/utils";
import { updatePost } from "@/redux/postsSlice";
import { PostSchema } from "@/lib/types/type";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "./ui/dropdown-menu";
import {
  Repeat2,
  PenLine,
  X,
  Paintbrush,
  CircleAlert,
  Images,
  CircleCheck,
  ChartBarDecreasing,
  Smile,
  Clock4,
  MapPin,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode, useState, useRef, useEffect, ChangeEvent } from "react";
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
import PostMaker from "./PostMaker";
import { useAppDispatch } from "@/redux/hooks";

interface Option {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
}

export default function ShareButton({
  children,
  post,
}: {
  children: ReactNode;
  post?: PostSchema;
}) {
  const { userdata } = useUser();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const socket = useSocket();
  const { files, clearFiles, setFiles } = useGlobalFileStorage();
  const [visibility, setVisibility] = useState("everyone");
  const [errors, setErrors] = useState([""]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [txtButton, setTxtButton] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [text, setText] = useState("");
  const [time, setTime] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const textLimit = 400;
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    if (!post) return;

    const interval = setInterval(() => {
      setTime(updateLiveTime("getlivetime", post.TimeOfPost));
    }, 1000);
    return () => clearInterval(interval); // This is important to clear the interval when the component unmounts
  }, [post?.TimeOfPost]);

  const handleImageClick = (file: File) => {
    setFullscreenImage(URL.createObjectURL(file));
  };

  const closeFullscreen = () => {
    setFullscreenImage(null);
  };

  const handleInput = () => {
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.style.height = "auto";
      textArea.style.height = `${textArea.scrollHeight}px`;
      setTxtButton(textArea.value.trim() !== "");
    }
  };

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
                post: post,
              });
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
                post: post,
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
      <div className="flex items-center justify-center gap-2 cursor-not-allowed">{children}</div>
    );

  return (
    <>
      {/* Mobile view */}
      <Drawer open={isDrawerOpen} onOpenChange={handleDrawerChange}>
        <DrawerTrigger className="tablets:hidden blog-foot flex items-center justify-center gap-2 cursor-pointer">
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
                    className="flex gap-1 items-center cursor-pointer w-full"
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
        <DropdownMenuTrigger className="hidden blog-foot tablets:flex items-center justify-center gap-2 cursor-pointer">
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-white hidden tablets:block dark:bg-zinc-800 w-auto space-y-2 mt-1 mr-2 p-2 rounded-md shadow-lg">
          {options.map(({ icon, text, onClick }, index) => {
            return (
              <Button
                key={index}
                className="flex gap-1 items-center cursor-pointer w-full bg-white dark:bg-zinc-900 text-black dark:text-white hover:bg-white/90 dark:hover:bg-zinc-900/90"
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
