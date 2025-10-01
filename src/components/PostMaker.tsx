import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { toast } from "@/hooks/use-toast";
import { useGlobalFileStorage } from "@/hooks/useFileStorage";
import { FILE_VALIDATION_CONFIG, formatFileSize, validateFile } from "@/lib/utils";
import MediaSlide from "@/templates/mediaSlides";
import { updateLiveTime } from "@/templates/PostProps";
import { PostSchema } from "@/lib/types/type";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import {
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
import {
  useState,
  useRef,
  useEffect,
  ChangeEvent,
  Dispatch,
  SetStateAction,
  ReactNode,
} from "react";
import CropMediaInterface from "./CropMediaInterface";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Input } from "./ui/input";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { renderTextWithLinks } from "@/components/RenderTextWithLinks";
import { EmojiPicker } from "./ui/emoji-picker";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";

export default function PostMaker({
  children,
  open,
  type = "post",
  post,
  onOpenChange,
}: {
  children?: ReactNode;
  open: boolean;
  type?: PostSchema["Type"];
  post?: PostSchema;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) {
  const navigate = useNavigateWithHistory();
  const { userdata } = useUser();
  const socket = useSocket();
  const { files, clearFiles, setFiles } = useGlobalFileStorage();
  const [visibility, setVisibility] = useState("everyone");
  const [errors, setErrors] = useState([""]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [txtButton, setTxtButton] = useState(false);
  const [text, setText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const textLimit = userdata.verified ? 10000 : 1000; // 10000 for verified users, 1000 for others
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    setTxtButton(files.length > 0);
  }, [files]);

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

  const handleInput = () => {
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.style.height = "auto";
      textArea.style.height = `${textArea.scrollHeight}px`;
      setTxtButton(textArea.value.trim() !== "");
    }
  };

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
      // console.log(error)
    } finally {
      setFiles([]);
      if (type === "post") navigate();
      else onOpenChange(false);
      setIsPosting(false);
    }
  };

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
      <DialogContent className="bg-white dark:bg-zinc-900 dialogCloseBtnHide mb:w-screen mb:max-w-none overflow-auto mb:h-full flex flex-col">
        <DialogHeader className="dark:text-white">
          <DialogTitle className="text-center"></DialogTitle>
          <DialogDescription>
            <span className="flex justify-between items-center">
              <DialogClose
                className="dark:text-white hover:bg-gray-800 p-2 rounded-full transition-all duration-200 transform hover:scale-110"
                onClick={() => {
                  if (type === "post") navigate();
                }}
              >
                <X size={16} />
              </DialogClose>
              <span className="text-brand text-xl font-bold">Drafts</span>
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 mb:max-h-none overflow-auto">
          {post && type === "comment" && (
            <>
              <MiniPostCard type={type} post={post} />
              <div className="text-gray-500 text-sm my-2">
                Replying to <span className="text-brand font-bold">@{post.Username}</span>
              </div>
            </>
          )}

          {/* User Info and Dropdown */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              {userdata.displayPicture ? (
                <img
                  src={userdata.displayPicture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Skeleton className="w-full h-full object-cover" />
              )}
            </div>
            <Select onValueChange={setVisibility} defaultValue="everyone" value={visibility}>
              <SelectTrigger className="max-w-[120px] h-8 rounded-2xl">
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
          <textarea
            ref={textAreaRef}
            value={text}
            maxLength={textLimit}
            spellCheck
            onChange={(e) => setText(e.target.value.substring(0, textLimit))}
            placeholder="Add a comment"
            className="flex-grow text-sm w-full mt-2 max-h-[400px] focus:border-b focus:border-brand resize-none bg-transparent border-none focus:outline-none dark:text-white"
            onInput={handleInput}
          />

          {/* Fullscreen Image Modal */}
          {fullscreenImage && (
            <Dialog open={!!fullscreenImage} onOpenChange={closeFullscreen}>
              <DialogContent className="bg-transparent dialogCloseBtnHide border-0 gap-0 h-screen max-w-none flex items-center justify-center">
                <DialogTitle className="text-center"></DialogTitle>
                <DialogClose className="absolute top-4 right-4 text-white">
                  <X size={24} />
                </DialogClose>
                <img
                  src={fullscreenImage}
                  alt="Fullscreen"
                  className="max-w-full max-h-full object-contain"
                />
              </DialogContent>
            </Dialog>
          )}

          {/** Media */}
          {files.length > 0 && (
            <div className="overflow-x-auto">
              <div className="flex gap-4 items-center justify-center p-2 status w-fit">
                {files.map((file, index) => (
                  <div key={index} className="relative group w-52">
                    {file.type.startsWith("image/") ? (
                      <>
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-40 object-cover rounded-lg"
                          onClick={() => handleImageClick(file)}
                        />
                        <CropMediaInterface files={files} setFiles={setFiles} imageIndex={index}>
                          <button className="absolute top-2 left-2 p-1 rounded-full bg-black/50 text-white opacity-0 mb:opacity-100 group-hover:opacity-100 transition-opacity">
                            <Paintbrush size={16} />
                          </button>
                        </CropMediaInterface>
                      </>
                    ) : file.type.startsWith("video/") ? (
                      <video
                        src={URL.createObjectURL(file)}
                        className="w-full h-40 object-cover rounded-lg"
                        controls
                      />
                    ) : null}
                    <button
                      onClick={() => {
                        const newFiles = files.filter((_, i) => i !== index);
                        setFiles(newFiles);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white opacity-0 mb:opacity-100 group-hover:opacity-100 transition-opacity"
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
          <div className="bg-white dark:bg-zinc-900 flex items-center text-brand space-x-2">
            <CircleAlert size={16} />
            <span>{visibility[0].toUpperCase() + visibility.slice(1)} can reply</span>
          </div>

          {/* Character Counter */}
          <div
            className={`flex justify-end text-gray-500 text-sm mb-2 ${text.length === textLimit ? "text-red-500" : ""}`}
          >
            <span>
              {text.length === textLimit && "You have reached the text characters limit! • "}
              {text.length}/{textLimit}
            </span>
          </div>

          <DialogFooter className="bg-white dark:bg-zinc-900">
            {/* Bottom Toolbar */}
            <div className="border-t border-gray-800 flex-1 py-3">
              <div className="gap-8 grid grid-cols-2 mb:grid-cols-1">
                <div className="flex justify-between items-center">
                  {buttons.map((button, index) => (
                    <TooltipProvider key={button.label + index}>
                      <Tooltip>
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
                              className="text-brand hover:bg-brand/90 group p-2 rounded-full transition-all duration-200"
                            >
                              <button.icon size={16} className="group-hover:text-white" />
                            </button>
                          )}
                        </TooltipTrigger>
                        <TooltipContent className="shadow-lg">
                          <span>{button.label}</span>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>

                <Button
                  disabled={!txtButton || text.length > textLimit}
                  onClick={handlePost}
                  className="bg-brand hover:bg-brand/60 text-white w-full my-2 tablets:w-auto tablets:my-0 font-bold py-2 px-6 rounded-full transition-all duration-200 transform hover:scale-105"
                >
                  {isPosting ? "Posting..." : "Post"}
                  {isPosting && <Loader2 className="animate-spin ml-2" size={16} />}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
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
  }, [post?.TimeOfPost]);

  return (
    <div className="border border-gray-500 rounded-xl p-4">
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
          <img
            src={post.DisplayPicture}
            alt={post.Username}
            className="w-full h-full object-cover"
          />
        </div>
        <div className={`flex-1 ${type !== "comment" ? "grid" : ""} gap-2 grid-cols-2`}>
          <div className="flex items-center col-span-2 flex-wrap">
            <span className="font-bold dark:text-white mr-1 truncate">{post.NameOfPoster}</span>
            {post.Verified && (
              <svg className="w-4 h-4 text-brand fill-current" viewBox="0 0 24 24">
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
              </svg>
            )}
            <span className="text-gray-500 ml-1">
              @{post.Username} · {time}
            </span>
          </div>

          {post.Caption ? (
            <p
              className={`dark:text-white text-sm mb-2 ${post.Image.length > 0 ? "" : "col-span-2"} whitespace-pre-wrap`}
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
        <DialogTitle className="text-center text-brand font-bold">Sign In Required</DialogTitle>
        <DialogDescription className="text-center text-gray-500 mt-2">
          You need to sign in or sign up to create a post.
        </DialogDescription>
        <DialogFooter className="flex justify-center mt-4">
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
