/* eslint-disable @next/next/no-img-element */
import {
  X,
  Paintbrush,
  CircleAlert,
  Images,
  ChartBarDecreasing,
  Smile,
  Clock4,
  MapPin,
  Loader2,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useState,
  useRef,
  useEffect,
  ChangeEvent,
  Dispatch,
  SetStateAction,
  ReactNode,
  Suspense,
} from "react";
import { TextAreaBox } from "react-textarea-enhanced";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { renderTextWithLinks } from "@/components/RenderTextWithLinks";
import { toast } from "@/hooks/use-toast";
import { useGlobalFileStorage } from "@/hooks/useFileStorage";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import { PostSchema } from "@/lib/types/type";
import { FILE_VALIDATION_CONFIG, formatFileSize, validateFile } from "@/lib/utils";
import MediaSlide from "@/templates/mediaSlides";
import { updateLiveTime } from "@/templates/PostProps";

import CropMediaInterface from "./CropMediaInterface";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
} from "./ui/dialog";
import { EmojiPicker } from "./ui/emoji-picker";
import { Input } from "./ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";


interface PostMakerClientProps {
  children?: ReactNode;
  open: boolean;
  type?: PostSchema["Type"];
  post?: PostSchema;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}

function PostMakerClient({
  children,
  open,
  type = "post",
  post,
  onOpenChange,
}: PostMakerClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigate = useNavigateWithHistory();
  const { userdata } = useUser();
  const socket = useSocket();
  const { files, clearFiles, setFiles } = useGlobalFileStorage();
  const [visibility, setVisibility] = useState("everyone");
  const [errors, setErrors] = useState([""]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [txtButton, setTxtButton] = useState(true);
  const [text, setText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const textLimit = userdata.verified ? 10000 : 1000; // 10000 for verified users, 1000 for others
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    setTxtButton(text.length > textLimit || (!files.length && !text.length));
  }, [files.length, text.length, textLimit]);

  const buttons = [
    {
      id: "media",
      icon: Images,
      label: "Add Images or Videos",
      action: () => imageInputRef?.current?.click(),
    },
    {
      id: "poll",
      icon: ChartBarDecreasing,
      label: "Add Poll",
      action: () => console.log("Add Poll"),
    },
    { id: "emoji", icon: Smile, label: "Add Emoji", action: () => {} },
    {
      id: "schedule",
      icon: Clock4,
      label: "Schedule Post",
      action: () => console.log("Schedule Post"),
    },
    {
      id: "location",
      icon: MapPin,
      label: "Add Location",
      action: () => console.log("Add Location"),
    },
  ];

  const handleImageClick = (file: File) => {
    setFullscreenImage(URL.createObjectURL(file));
  };

  const closeFullscreen = () => {
    setFullscreenImage(null);
  };

  useEffect(() => {
    console.groupCollapsed(errors.length);
  }, [errors]);

  function handleFiles(e: ChangeEvent<HTMLInputElement>): void {
    if (!imageInputRef.current) return;

    const mediaFiles = e.target.files;
    if (!mediaFiles) return;

    const newFiles = Array.from(mediaFiles);
    const validationErrors: string[] = [];
    const validFiles: File[] = [];

    // Check total number of files
    if (files.length > FILE_VALIDATION_CONFIG.maxFiles) {
      toast({
        title: "Warning",
        description: `Maximum ${FILE_VALIDATION_CONFIG.maxFiles} files allowed`,
        variant: "destructive",
      });
      clearFiles();
      return;
    }

    // Calculate total size including existing files
    const existingSize = files.reduce((acc, file) => acc + file.size, 0);
    const newTotalSize = newFiles.reduce((acc, file) => acc + file.size, existingSize);

    if (newTotalSize > FILE_VALIDATION_CONFIG.maxTotalSize) {
      toast({
        title: "Warning",
        description: `Total size exceeds ${formatFileSize(FILE_VALIDATION_CONFIG.maxTotalSize)}`,
        variant: "destructive",
      });
      return;
    }

    // Validate each file
    newFiles.forEach((file) => {
      try {
        validateFile(file, FILE_VALIDATION_CONFIG);
        validFiles.push(file);
      } catch (error) {
        if (error instanceof Error) {
          validationErrors.push(error.message);
        }
      }
    });

    // Update state
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      validationErrors.forEach((error) =>
        toast({
          title: "Warning",
          description: error,
        })
      );
    }

    if (validFiles.length > 0) {
      setFiles(validFiles);
    }

    // Reset input
    e.target.value = "";
  }

  const handlePost = async () => {
    if (!socket) return;
    setIsPosting(true);

    try {
      let media: string[] = [];
      if (files.length > 0) {
        media = await Promise.all(
          files.map(async (file) => {
            const response = await fetch("/api/upload", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                filename: file!.name,
                contentType: file!.type,
                bucketName: "post-s",
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to upload image");
            }

            const { url, fields } = await response.json();
            const formData1 = new FormData();

            for (const key in fields) {
              formData1.append(key, fields[key]);
            }

            formData1.append("file", file);

            const uploadResponse = await fetch(url, {
              method: "POST",
              body: formData1,
            });

            if (!uploadResponse.ok) {
              throw new Error("Failed to upload image");
            }
            return url + fields.key;
          })
        );
      }

      if (type === "quote") {
        if (!post) return;
        const quote: Partial<PostSchema> = {
          Visibility: visibility as PostSchema["Visibility"],
          Caption: text,
          Image: media,
          Code: "",
          WhoCanComment: visibility as PostSchema["WhoCanComment"],
          OriginalPostId: post.PostID,
        };

        socket.emit("reactToPost(share)", {
          action: "share",
          type: "quote",
          post: quote,
        });
      } else {
        if (!post && type === "comment") return;
        const Post: PostSchema = {
          _id: "",
          UserId: "",
          DisplayPicture: "",
          NameOfPoster: "",
          Verified: false,
          TimeOfPost: new Date().toISOString(),
          Visibility: visibility as PostSchema["WhoCanComment"],
          Caption: text,
          Image: media,
          IsFollowing: false,
          NoOfLikes: 0,
          Liked: false,
          NoOfComment: 0,
          NoOfShares: 0,
          NoOfBookmarks: 0,
          Bookmarked: false,
          Username: "",
          PostID: "",
          Code: "",
          WhoCanComment: visibility as PostSchema["WhoCanComment"],
          Shared: false,
          Type: type,
          ParentId: post ? post.PostID : "",
        };
        socket.emit("post", Post);
      }
    } catch (error: any) {
      console.log(error)
    } finally {
      setFiles([]);
      if (type === "post") navigate();
      else onOpenChange(false);
      setIsPosting(false);
    }
  };

  useEffect(() => {
    if (!open && (pathname?.includes("/compose/post") || searchParams?.get("composeComment"))) {
      router.back();
    }
  }, [open]);

  if (!userdata._id) {
    if (children) {
      return (
        <>
          {children}
          <SignInPrompt open={open} onClose={() => onOpenChange(false)} />
        </>
      );
    }
    return <SignInPrompt open={open} onClose={() => onOpenChange(false)} />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="dialogCloseBtnHide flex flex-col overflow-auto bg-white mb:h-full mb:w-screen mb:max-w-none dark:bg-zinc-900">
        <DialogHeader className="dark:text-white">
          <DialogTitle className="text-center"></DialogTitle>
          <DialogDescription>
            <span className="flex items-center justify-between">
              <DialogClose
                className="transform rounded-full p-2 transition-all duration-200 hover:scale-110 hover:bg-gray-800 dark:text-white"
              >
                <X size={16} />
              </DialogClose>
              <span className="text-xl font-bold text-brand">Drafts</span>
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-auto p-1 mb:max-h-none">
          {post && type === "comment" && (
            <>
              <MiniPostCard type={type} post={post} />
              <div className="my-2 text-sm text-gray-500">
                Replying to <span className="font-bold text-brand">@{post.Username}</span>
              </div>
            </>
          )}

          {/* User Info and Dropdown */}
          <div className="flex items-center space-x-3">
            <div className="size-10 overflow-hidden rounded-full">
              {userdata.displayPicture ? (
                <img
                  src={userdata.displayPicture}
                  alt="Profile"
                  className="size-full object-cover"
                />
              ) : (
                <Skeleton className="size-full object-cover" />
              )}
            </div>
            <Select onValueChange={setVisibility} defaultValue="everyone" value={visibility}>
              <SelectTrigger className="h-8 max-w-[120px] rounded-2xl">
                <SelectValue placeholder="Everyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="friends">Friends</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            accept=".jpg, .jpeg, .png, .gif, .mp4, .mov, .webm, .mp3, .wav, .ogg"
            id="mediaInput"
            ref={imageInputRef}
            type="file"
            multiple
            onChange={handleFiles}
            className="hidden"
          />

          {/* Comment Input */}
          <TextAreaBox
            ref={textAreaRef}
            value={text}
            onChange={setText}
            highlightColor="#ff6257"
            minHeight={60}
            maxHeight={400}
            charLimit={textLimit}
            spellCheck
            placeholder="What's on your mind?"
            fontFamily="myCustomFont, myCustomFont Fallback"
            className="mt-2 w-full flex-grow resize-none border-none bg-transparent px-4 py-2 text-sm !text-black focus:border-b focus:border-brand focus:outline-none dark:!text-white dark:!caret-white"
            textareaClassName="!caret-black dark:!caret-white placeholder:!text-black dark:placeholder:!text-slate-200"
          />

          {/* Fullscreen Image Modal */}
          {fullscreenImage && (
            <Dialog open={!!fullscreenImage} onOpenChange={closeFullscreen}>
              <DialogContent className="dialogCloseBtnHide flex h-screen max-w-none items-center justify-center gap-0 border-0 bg-transparent">
                <DialogTitle className="text-center"></DialogTitle>
                <DialogClose className="absolute right-4 top-4 text-white">
                  <X size={24} />
                </DialogClose>
                <img
                  src={fullscreenImage}
                  alt="Fullscreen"
                  className="max-h-full max-w-full object-contain"
                />
              </DialogContent>
            </Dialog>
          )}

          {/** Media */}
          {files.length > 0 && (
            <div className="overflow-x-auto">
              <div className="status flex w-fit items-center justify-center gap-4 p-2">
                {files.map((file, index) => (
                  <div key={index} className="group relative w-52">
                    {file.type.startsWith("image/") ? (
                      <>
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-40 w-full rounded-lg object-cover"
                          onClick={() => handleImageClick(file)}
                        />
                        <CropMediaInterface files={files} setFiles={setFiles} imageIndex={index}>
                          <button className="absolute left-2 top-2 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 mb:opacity-100">
                            <Paintbrush size={16} />
                          </button>
                        </CropMediaInterface>
                      </>
                    ) : file.type.startsWith("video/") ? (
                      <video
                        src={URL.createObjectURL(file)}
                        className="h-40 w-full rounded-lg object-cover"
                        controls
                      />
                    ) : null}
                    <button
                      onClick={() => {
                        const newFiles = files.filter((_, i) => i !== index);
                        setFiles(newFiles);
                      }}
                      className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 mb:opacity-100"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Post Card */}
          {post && type !== "comment" && <MiniPostCard post={post} />}
        </div>

        <div className="sticky bottom-0 space-y-2">
          {/* Everyone Can Reply */}
          <div className="flex items-center space-x-2 bg-white text-brand dark:bg-zinc-900">
            <CircleAlert size={16} />
            <span>{visibility[0].toUpperCase() + visibility.slice(1)} can reply</span>
          </div>

          {/* Character Counter */}
          <div
            className={`mb-2 flex justify-end text-sm text-gray-500 ${text.length > textLimit ? "text-red-500" : ""}`}
          >
            <span>
              {text.length > textLimit ? "You have reached the text characters limit! • " : ""}
              {text.length}/{textLimit}
            </span>
          </div>

          <DialogFooter className="bg-white dark:bg-zinc-900">
            {/* Bottom Toolbar */}
            <div className="flex-1 border-t border-gray-800 py-3">
              <div className="grid grid-cols-2 gap-8 mb:grid-cols-1">
                <div className="flex items-center justify-between">
                  {buttons.map((button, index) => (
                    <Tooltip key={button.label + index}>
                      <TooltipTrigger asChild>
                        {button.id === "emoji" ? (
                          <EmojiPicker
                            triggerClassName="text-brand hover:bg-brand/90 group p-2 rounded-full transition-all duration-200"
                            onChange={(emoji: string) => setText((prev) => prev + emoji)}
                          >
                            <button.icon size={16} className="group-hover:text-white " />
                          </EmojiPicker>
                        ) : (
                          <button
                            onClick={button.action}
                            className="group rounded-full p-2 text-brand transition-all duration-200 hover:bg-brand/90"
                          >
                            <button.icon size={16} className="group-hover:text-white" />
                          </button>
                        )}
                      </TooltipTrigger>
                      <TooltipContent className="shadow-lg">
                        <span>{button.label}</span>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                <Button
                  disabled={txtButton}
                  onClick={handlePost}
                  className="my-2 w-full transform rounded-full bg-brand px-6 py-2 font-bold text-white transition-all duration-200 hover:scale-105 hover:bg-brand/60 tablets:my-0 tablets:w-auto"
                >
                  {isPosting ? "Posting..." : "Post"}
                  {isPosting && <Loader2 className="ml-2 animate-spin" size={16} />}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PostMaker(props: PostMakerClientProps) {
  return (
    <Suspense fallback={<></>}>
      <PostMakerClient {...props} />
    </Suspense>
  );
}

function MiniPostCard({
  post,
  type = "post",
}: {
  post: PostSchema;
  type?: PostSchema["Type"];
}): ReactNode {
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!post) return;

    const interval = setInterval(() => {
      setTime(updateLiveTime("getlivetime", post.TimeOfPost));
    }, 1000);
    return () => clearInterval(interval); // This is important to clear the interval when the component unmounts
  }, [post, post.TimeOfPost]);

  return (
    <div className="rounded-xl border border-gray-500 p-4">
      <div className="flex items-start space-x-3">
        <div className="size-10 flex-shrink-0 overflow-hidden rounded-full">
          <img
            src={post.DisplayPicture}
            alt={post.Username}
            className="size-full object-cover"
          />
        </div>
        <div className={`flex-1 ${type !== "comment" ? "grid" : ""} grid-cols-2 gap-2`}>
          <div className="col-span-2 flex flex-wrap items-center">
            <span className="mr-1 truncate font-bold dark:text-white">{post.NameOfPoster}</span>
            {post.Verified && (
              <svg className="size-4 fill-current text-brand" viewBox="0 0 24 24">
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
              </svg>
            )}
            <span className="ml-1 text-gray-500">
              @{post.Username} · {time}
            </span>
          </div>

          {post.Caption ? (
            <p
              className={`mb-2 text-sm dark:text-white ${post.Image.length > 0 ? "" : "col-span-2"} whitespace-pre-wrap`}
            >
              {post.Caption.length > 250
                ? renderTextWithLinks(post.Caption.substring(0, 250)) + "..."
                : renderTextWithLinks(post.Caption)}
            </p>
          ) : null}
          {/* {showMore} */}
          {post.Image.length > 0 && type !== "comment" && (
            <MediaSlide
              className={`overflow-auto rounded-lg ${!post.Caption.length ? "col-span-2" : ""}`}
              postData={post}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SignInPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { userdata } = useUser();

  useEffect(() => {
    if (userdata._id) {
      onClose();
    }
  }, [userdata, onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-zinc-900">
        <DialogTitle className="text-center font-bold text-brand">Sign In Required</DialogTitle>
        <DialogDescription className="mt-2 text-center text-gray-500">
          You need to sign in or sign up to create a post.
        </DialogDescription>
        <DialogFooter className="mt-4 flex justify-center">
          <Button onClick={() => router.push("/signin")} className="bg-brand text-white">
            Sign In
          </Button>
          <Button onClick={() => router.push("/signup")} className="ml-2 bg-gray-500 text-white">
            Sign Up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
